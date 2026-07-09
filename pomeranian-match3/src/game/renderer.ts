import { BOARD_COLS, BOARD_ROWS, EMPTY_CELL } from './constants';
import type { Cell, Position } from './board';
import { createPomAtlas, getAtlasUv } from './sprites';

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
in vec4 a_color;

out vec2 v_texCoord;
out vec4 v_color;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
  v_color = a_color;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;

uniform sampler2D u_texture;
in vec2 v_texCoord;
in vec4 v_color;
out vec4 outColor;

void main() {
  vec4 tex = texture(u_texture, v_texCoord);
  outColor = tex * v_color;
  if (outColor.a < 0.05) discard;
}
`;

interface AnimTile {
  type: number;
  x: number;
  y: number;
  scale: number;
  alpha: number;
}

export interface BoardLayout {
  originX: number;
  originY: number;
  cellSize: number;
  boardPixelW: number;
  boardPixelH: number;
  padding: number;
}

const FLOATS_PER_VERTEX = 8; // x,y,u,v,r,g,b,a
const VERTICES_PER_QUAD = 6;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    throw new Error(`Program link error: ${info}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
}

export class WebGLRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly buffer: WebGLBuffer;
  private readonly texture: WebGLTexture;
  private readonly typeCount: number;
  private readonly maxQuads: number;
  private readonly vertexData: Float32Array;
  private layout: BoardLayout;
  private dpr = 1;

  // Visual state overlays
  selected: Position | null = null;
  hint: [Position, Position] | null = null;
  hintPulse = 0;

  /** Animated tiles that override static board cells during transitions */
  private animTiles: AnimTile[] = [];
  private hiddenCells = new Set<string>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });
    if (!gl) {
      throw new Error('WebGL2 is not supported in this browser');
    }
    this.gl = gl;

    this.program = createProgram(gl);
    this.maxQuads = BOARD_COLS * BOARD_ROWS + 16;
    this.vertexData = new Float32Array(this.maxQuads * VERTICES_PER_QUAD * FLOATS_PER_VERTEX);

    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    if (!vao || !buffer) throw new Error('Failed to create WebGL buffers');
    this.vao = vao;
    this.buffer = buffer;

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);

    const stride = FLOATS_PER_VERTEX * 4;
    const aPos = gl.getAttribLocation(this.program, 'a_position');
    const aTex = gl.getAttribLocation(this.program, 'a_texCoord');
    const aCol = gl.getAttribLocation(this.program, 'a_color');

    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(aCol);
    gl.vertexAttribPointer(aCol, 4, gl.FLOAT, false, stride, 16);

    // Texture atlas
    const atlas = createPomAtlas();
    this.typeCount = atlas.typeCount;
    const texture = gl.createTexture();
    if (!texture) throw new Error('Failed to create texture');
    this.texture = texture;

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.layout = this.computeLayout();
  }

  getLayout(): BoardLayout {
    return this.layout;
  }

  resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = parent.clientWidth;
    const cssH = parent.clientHeight;

    this.canvas.width = Math.floor(cssW * this.dpr);
    this.canvas.height = Math.floor(cssH * this.dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.layout = this.computeLayout();
  }

  private computeLayout(): BoardLayout {
    const cssW = this.canvas.clientWidth || 1;
    const cssH = this.canvas.clientHeight || 1;
    const padding = Math.min(cssW, cssH) * 0.04;
    const availableW = cssW - padding * 2;
    const availableH = cssH - padding * 2;
    const cellSize = Math.floor(Math.min(availableW / BOARD_COLS, availableH / BOARD_ROWS));
    const boardPixelW = cellSize * BOARD_COLS;
    const boardPixelH = cellSize * BOARD_ROWS;
    const originX = (cssW - boardPixelW) / 2;
    const originY = (cssH - boardPixelH) / 2;
    return { originX, originY, cellSize, boardPixelW, boardPixelH, padding };
  }

  cellAt(clientX: number, clientY: number): Position | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const { originX, originY, cellSize } = this.layout;

    const col = Math.floor((x - originX) / cellSize);
    const row = Math.floor((y - originY) / cellSize);

    if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) {
      return null;
    }
    return { row, col };
  }

  clearAnimations(): void {
    this.animTiles = [];
    this.hiddenCells.clear();
  }

  hideCell(row: number, col: number): void {
    this.hiddenCells.add(`${row},${col}`);
  }

  showAllCells(): void {
    this.hiddenCells.clear();
  }

  setSwapAnimation(
    a: Position,
    b: Position,
    typeA: number,
    typeB: number,
    progress: number,
  ): void {
    this.animTiles = [];
    this.hiddenCells.clear();
    this.hideCell(a.row, a.col);
    this.hideCell(b.row, b.col);

    const t = easeOutCubic(Math.min(1, Math.max(0, progress)));
    const { originX, originY, cellSize } = this.layout;

    const ax0 = originX + a.col * cellSize + cellSize / 2;
    const ay0 = originY + a.row * cellSize + cellSize / 2;
    const bx0 = originX + b.col * cellSize + cellSize / 2;
    const by0 = originY + b.row * cellSize + cellSize / 2;

    this.animTiles.push({
      type: typeA,
      x: ax0 + (bx0 - ax0) * t,
      y: ay0 + (by0 - ay0) * t,
      scale: 1.05,
      alpha: 1,
    });
    this.animTiles.push({
      type: typeB,
      x: bx0 + (ax0 - bx0) * t,
      y: by0 + (ay0 - by0) * t,
      scale: 1.05,
      alpha: 1,
    });
  }

  setPopAnimation(cells: Position[], types: number[], progress: number): void {
    this.animTiles = [];
    this.hiddenCells.clear();
    const t = Math.min(1, Math.max(0, progress));
    const scale = 1 + 0.35 * t;
    const alpha = 1 - easeInBack(Math.min(1, t));
    const { originX, originY, cellSize } = this.layout;

    for (let i = 0; i < cells.length; i++) {
      const { row, col } = cells[i];
      this.hideCell(row, col);
      this.animTiles.push({
        type: types[i],
        x: originX + col * cellSize + cellSize / 2,
        y: originY + row * cellSize + cellSize / 2,
        scale,
        alpha: Math.max(0, alpha),
      });
    }
  }

  setFallAnimation(
    falls: { fromRow: number; toRow: number; col: number; type: number }[],
    spawns: { row: number; col: number; type: number; fromRow: number }[],
    progress: number,
  ): void {
    this.animTiles = [];
    this.hiddenCells.clear();
    const t = easeOutCubic(Math.min(1, Math.max(0, progress)));
    const { originX, originY, cellSize } = this.layout;

    for (const fall of falls) {
      this.hideCell(fall.toRow, fall.col);
      const y0 = originY + fall.fromRow * cellSize + cellSize / 2;
      const y1 = originY + fall.toRow * cellSize + cellSize / 2;
      this.animTiles.push({
        type: fall.type,
        x: originX + fall.col * cellSize + cellSize / 2,
        y: y0 + (y1 - y0) * t,
        scale: 1,
        alpha: 1,
      });
    }

    for (const spawn of spawns) {
      this.hideCell(spawn.row, spawn.col);
      const y0 = originY + spawn.fromRow * cellSize + cellSize / 2;
      const y1 = originY + spawn.row * cellSize + cellSize / 2;
      this.animTiles.push({
        type: spawn.type,
        x: originX + spawn.col * cellSize + cellSize / 2,
        y: y0 + (y1 - y0) * t,
        scale: 0.85 + 0.15 * t,
        alpha: 1,
      });
    }
  }

  render(board: Cell[][], nowMs: number): void {
    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w === 0 || h === 0) return;

    // Warm chocolate background clear (transparent — CSS paints bg)
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    const uTex = gl.getUniformLocation(this.program, 'u_texture');
    gl.uniform1i(uTex, 0);

    let quadCount = 0;
    const cssW = this.canvas.clientWidth;
    const cssH = this.canvas.clientHeight;
    const { originX, originY, cellSize } = this.layout;
    const inset = cellSize * 0.08;

    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const type = board[row][col];
        if (type === EMPTY_CELL) continue;
        if (this.hiddenCells.has(`${row},${col}`)) continue;

        let scale = 1;
        let alpha = 1;
        let bounceY = 0;

        if (this.selected && this.selected.row === row && this.selected.col === col) {
          scale = 1.12;
          bounceY = -cellSize * 0.04;
        }

        if (this.hint) {
          const [ha, hb] = this.hint;
          if (
            (ha.row === row && ha.col === col) ||
            (hb.row === row && hb.col === col)
          ) {
            const pulse = 0.5 + 0.5 * Math.sin((nowMs / 200) * Math.PI);
            scale = 1 + 0.1 * pulse;
            bounceY = -cellSize * 0.05 * pulse;
          }
        }

        const cx = originX + col * cellSize + cellSize / 2;
        const cy = originY + row * cellSize + cellSize / 2 + bounceY;
        const half = ((cellSize - inset * 2) / 2) * scale;

        quadCount = this.writeQuad(
          quadCount,
          cx - half,
          cy - half,
          cx + half,
          cy + half,
          type,
          1,
          1,
          1,
          alpha,
          cssW,
          cssH,
        );
      }
    }

    for (const tile of this.animTiles) {
      const half = ((cellSize - inset * 2) / 2) * tile.scale;
      quadCount = this.writeQuad(
        quadCount,
        tile.x - half,
        tile.y - half,
        tile.x + half,
        tile.y + half,
        tile.type,
        1,
        1,
        1,
        tile.alpha,
        cssW,
        cssH,
      );
    }

    if (quadCount === 0) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      0,
      this.vertexData.subarray(0, quadCount * VERTICES_PER_QUAD * FLOATS_PER_VERTEX),
    );
    gl.drawArrays(gl.TRIANGLES, 0, quadCount * VERTICES_PER_QUAD);
  }

  private writeQuad(
    quadIndex: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    type: number,
    r: number,
    g: number,
    b: number,
    a: number,
    cssW: number,
    cssH: number,
  ): number {
    if (quadIndex >= this.maxQuads) return quadIndex;

    const toNdcX = (x: number) => (x / cssW) * 2 - 1;
    const toNdcY = (y: number) => 1 - (y / cssH) * 2;
    const uv = getAtlasUv(type, this.typeCount);

    const nx0 = toNdcX(x0);
    const ny0 = toNdcY(y0);
    const nx1 = toNdcX(x1);
    const ny1 = toNdcY(y1);

    const base = quadIndex * VERTICES_PER_QUAD * FLOATS_PER_VERTEX;
    const v = this.vertexData;

    // Triangle 1: TL, TR, BL
    // Triangle 2: TR, BR, BL
    const verts = [
      [nx0, ny0, uv.u0, uv.v0],
      [nx1, ny0, uv.u1, uv.v0],
      [nx0, ny1, uv.u0, uv.v1],
      [nx1, ny0, uv.u1, uv.v0],
      [nx1, ny1, uv.u1, uv.v1],
      [nx0, ny1, uv.u0, uv.v1],
    ];

    for (let i = 0; i < 6; i++) {
      const o = base + i * FLOATS_PER_VERTEX;
      v[o] = verts[i][0];
      v[o + 1] = verts[i][1];
      v[o + 2] = verts[i][2];
      v[o + 3] = verts[i][3];
      v[o + 4] = r;
      v[o + 5] = g;
      v[o + 6] = b;
      v[o + 7] = a;
    }

    return quadIndex + 1;
  }
}

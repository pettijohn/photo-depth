import type { GLResource } from './types';

export class GLProgram implements GLResource {
  readonly value: WebGLProgram;
  private readonly gl: WebGL2RenderingContext;

  constructor(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string) {
    this.gl = gl;
    const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error('Could not create a WebGL program.');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) ?? 'WebGL program link failed.';
      gl.deleteProgram(program);
      throw new Error(message);
    }
    this.value = program;
  }

  uniform(name: string): WebGLUniformLocation {
    const location = this.gl.getUniformLocation(this.value, name);
    if (location === null) throw new Error(`Shader uniform not found: ${name}`);
    return location;
  }

  dispose(): void {
    this.gl.deleteProgram(this.value);
  }
}

export class GLTexture implements GLResource {
  readonly value: WebGLTexture;
  constructor(private readonly gl: WebGL2RenderingContext) {
    const texture = gl.createTexture();
    if (!texture) throw new Error('Could not create a WebGL texture.');
    this.value = texture;
  }
  dispose(): void { this.gl.deleteTexture(this.value); }
}

export class GLTarget implements GLResource {
  readonly texture: GLTexture;
  readonly framebuffer: WebGLFramebuffer;

  constructor(private readonly gl: WebGL2RenderingContext, readonly width: number, readonly height: number) {
    this.texture = new GLTexture(gl);
    gl.bindTexture(gl.TEXTURE_2D, this.texture.value);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) throw new Error('Could not create a WebGL framebuffer.');
    this.framebuffer = framebuffer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture.value, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      this.dispose();
      throw new Error('The WebGL framebuffer is incomplete.');
    }
  }

  dispose(): void {
    this.gl.deleteFramebuffer(this.framebuffer);
    this.texture.dispose();
  }
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Could not create a WebGL shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'WebGL shader compilation failed.';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

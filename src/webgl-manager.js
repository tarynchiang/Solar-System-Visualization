import { FRAGMENT_SHADER_HEADER } from "./shaders.js";

//////////////////////////////////////////////////////////////////////////////////////////
//
// WEBGL MANAGER
//
//////////////////////////////////////////////////////////////////////////////////////////
export class WebGLManager {

  constructor(canvas, uniformConfig, orbitConfig, startTime) {
    this.gl = this.initGL(canvas);
    if (!this.gl) throw new Error("WebGL is not supported by this browser.");

    this.startTime = startTime;
    this.uniformConfig = uniformConfig;
    this.orbitConfig = orbitConfig;
  }

  initGL(canvas) {
    return (
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    );
  }

  loadAndCompileShader(type, src, program) {
    const shader = this.gl.createShader(type);

    this.gl.shaderSource(shader, src);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const msg = this.gl.getShaderInfoLog(shader);
      console.log("Cannot compile shader:\n\n" + msg);
    }

    this.gl.attachShader(program, shader);
  }

  createShaderProgram(vertexShader, fragmentShader) {
    // Create the WebGL program.
    const program = this.gl.createProgram();

    // Add the vertex and fragment shaders.
    this.loadAndCompileShader(this.gl.VERTEX_SHADER, vertexShader, program);
    this.loadAndCompileShader(
      this.gl.FRAGMENT_SHADER,
      FRAGMENT_SHADER_HEADER + fragmentShader,
      program
    );

    // Link the program, report any errors.
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS))
      console.log("Could not link the shader program!");
    this.gl.useProgram(program);

    return program;
  }

  configureGeometry() {
    // Create a square as a triangle strip
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.createBuffer());

    // consisting of two triangles.
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0]),
      this.gl.STATIC_DRAW
    );

    // Set aPos attribute for each vertex.
    const aPos = this.gl.getAttribLocation(this.gl.program, "aPos");
    this.gl.enableVertexAttribArray(aPos);
    this.gl.vertexAttribPointer(aPos, 3, this.gl.FLOAT, false, 0, 0);
  }

  setShaders(vertexShader, fragmentShader) {
    const program = this.createShaderProgram(vertexShader, fragmentShader);
    this.gl.program = program;
    this.configureGeometry();
  }

  setUniform(type, name, ...values) {
    const loc = this.gl.getUniformLocation(this.gl.program, name);

    if (loc === null) {
      console.warn(`Uniform '${name}' not found.`);
      return;
    }

    const functionName = `uniform${type}`;

    if (typeof this.gl[functionName] !== "function") {
      console.error(`Function 'gl.${functionName}' is not a valid function.`);
      return;
    }

    this.gl[functionName](loc, ...values);
  }

  setUniforms() {
    // Dynamic uniforms.
    const time = (Date.now() - this.startTime) / 1000;
    const canvas = document.getElementById("canvas1");

    // Define a list of uniforms with type, name, and value.
    const dynamicUniforms = [
      { type: "1f", name: "uTime", value: time },
      {
        type: "2f",
        name: "uResolution",
        value: [canvas.width, canvas.height],
      },
    ];

    // Process dynamic uniforms.
    dynamicUniforms.forEach((uni) => {
      const values = Array.isArray(uni.value) ? uni.value : [uni.value];
      this.setUniform(uni.type, uni.name, ...values);
    });

    // Process static uniforms.
    for (const uniformName in this.uniformConfig) {
      const { type, value } = this.uniformConfig[uniformName];
      const values = Array.isArray(value) ? value : [value];
      this.setUniform(type, uniformName, ...values);
    }
  }

  // Helper method to load an image as a Promise.
  loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load image at ${url}`));
      image.src = url;
    });
  }

  isPowerOf2(value) {
    return (value & (value - 1)) === 0;
  }

  async loadTexture(url) {
    const level = 0;
    const internalFormat = this.gl.RGBA;
    const srcFormat = this.gl.RGBA;
    const srcType = this.gl.UNSIGNED_BYTE;

    try {
      // Wait for the image to load.
      const image = await this.loadImage(url);
      // Create and bind texture.
      const texture = this.gl.createTexture();
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true); // Flip the image's Y axis.
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        level,
        internalFormat,
        srcFormat,
        srcType,
        image
      );

      // Check if the image dimensions are power of 2.
      if (this.isPowerOf2(image.width) && this.isPowerOf2(image.height)) {
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.gl.texParameteri(
          this.gl.TEXTURE_2D,
          this.gl.TEXTURE_MIN_FILTER,
          this.gl.LINEAR_MIPMAP_LINEAR
        );
      } else {
        this.gl.texParameteri(
          this.gl.TEXTURE_2D,
          this.gl.TEXTURE_WRAP_S,
          this.gl.CLAMP_TO_EDGE
        );
        this.gl.texParameteri(
          this.gl.TEXTURE_2D,
          this.gl.TEXTURE_WRAP_T,
          this.gl.CLAMP_TO_EDGE
        );
        this.gl.texParameteri(
          this.gl.TEXTURE_2D,
          this.gl.TEXTURE_MIN_FILTER,
          this.gl.LINEAR
        );
      }

      return texture;
    } catch (error) {
      throw new Error(
        `Failed to load texture image: ${url} \n ${error.message}`
      );
    }
  }

  updateOrbitingPosition(
    orbiter,
    central,
    orbitRadius,
    orbitSpeed,
    options = {}
  ) {
    const { invert = false, angleOffset = 0 } = options;
    const time = (Date.now() - this.startTime) / 1000;
    let angle = orbitSpeed * time + angleOffset;

    // Determine new X and Z coordinates.
    // If invert is true, the orbiter is placed in the opposite direction.
    if (invert) {
      orbiter.center[0] = central.center[0] - orbitRadius * Math.cos(angle);
      orbiter.center[2] = central.center[2] - orbitRadius * Math.sin(angle);
    } else {
      orbiter.center[0] = central.center[0] + orbitRadius * Math.cos(angle);
      orbiter.center[2] = central.center[2] + orbitRadius * Math.sin(angle);
    }

    orbiter.center[1] = central.center[1];
  }

  async loadAllTextures(textureConfig) {
    const loadedTextures = {};

    // Load all textures and store them in the object with their names as keys
    for (const [uniformName, config] of Object.entries(textureConfig)) {
      const texture = await this.loadTexture(config.url);
      loadedTextures[uniformName] = {
        texture,
        config,
      };
    }

    return loadedTextures;
  }

  async setTextures(loadedTextures) {
    for (const [uniformName, { texture, config }] of Object.entries(
      loadedTextures
    )) {
      const { unit, type } = config;

      // Activate the correct texture unit
      this.gl.activeTexture(this.gl.TEXTURE0 + unit);
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

      // Set texture filtering parameters
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MIN_FILTER,
        this.gl.LINEAR
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MAG_FILTER,
        this.gl.LINEAR
      );

      // Set the uniform for the shader
      this.setUniform(type, uniformName, unit);
    }
  }

  async startGL(shaders, textureConfig) {
    // setup webgl conetxt and shaders
    const { vertexShader, fragmentShader } = shaders;
    this.setShaders(vertexShader, fragmentShader);

    //load textures concurrently
    if (textureConfig) {
      const loadedTextures = await this.loadAllTextures(textureConfig);
      await this.setTextures(loadedTextures);
    }
  }

  animate() {
    if (this.startTime === undefined) this.startTime = Date.now();

    if (this.orbitConfig) {
      for (const key in this.orbitConfig) {
        const orbit = this.orbitConfig[key];
        this.updateOrbitingPosition(
          orbit.orbiter,
          orbit.central,
          orbit.orbitRadius,
          orbit.orbitSpeed,
          orbit.options
        );
      }
    }

    this.setUniforms();

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}

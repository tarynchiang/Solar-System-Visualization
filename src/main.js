import { WebGLManager } from "./webgl-manager.js"
import { vertexShaderSource, fragmentShaderSource } from "./shaders.js"
import { sceneConfigs } from "./scene-configs.js"

document.addEventListener("DOMContentLoaded", async () => {
    const canvas = document.getElementById("canvas1");
    const startTime = Date.now();

    const { uniformConfig, textureConfig, orbitConfig } = sceneConfigs;

    const webGLManager = new WebGLManager(canvas, uniformConfig, orbitConfig, startTime);

    function animationLoop() {
        requestAnimationFrame(animationLoop);
        webGLManager.animate();
    }

    try {
        // Initialization code
        await webGLManager.startGL({ vertexShader: vertexShaderSource, fragmentShader: fragmentShaderSource }, textureConfig);
        requestAnimationFrame(animationLoop);
    } catch (error) {
        console.error("Initialization error:", error);
    }
})
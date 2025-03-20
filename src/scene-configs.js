// Animation Speeds
const orbitSpeeds = {
    moon: 0.4,
    earth: 0.1,
};

// Camera properties
const camera = {
    position: [0.0, 0.0, 32.0],  // Positioned along Z-axis
    direction: [0.0, 0.0, -1.0],  // Looking towards negative Z-axis
    up: [0.0, 1.0, 0.0],         // Up vector along Y-axis
};

// Celestial Bodies
const sun = {
    center: [0.0, 0.0, 0.0], // Sun position
    radius: 8.0,
    color: [1.0, 0.35, 0.0],
};

const moon = {
    center: [0.0, 0.0, 10.0], // Moon initial position
    radius: 0.5,
    color: [0.5, 0.5, 0.5],
};

const earth = {
    center: [-60.0, 0.0, 0.0], // Earth initial position
    radius: 1.5,
    color: [0.2, 0.4, 1.0], // Blue color for Earth
};

// Uniform Configuration for Shaders
const uniformConfig = {
    uCameraPos: { type: "3f", value: camera.position },
    uCameraDir: { type: "3f", value: camera.direction },
    uCameraUp: { type: "3f", value: camera.up },
    uMoonPos: { type: "3f", value: moon.center },
    uMoonRadius: { type: "1f", value: moon.radius },
    uMoonColor: { type: "3f", value: moon.color },
    uSunPos: { type: "3f", value: sun.center },
    uSunRadius: { type: "1f", value: sun.radius },
    uSunColor: { type: "3f", value: sun.color },
    uEarthPos: { type: "3f", value: earth.center },
    uEarthRadius: { type: "1f", value: earth.radius },
    uEarthColor: { type: "3f", value: earth.color },
};

// Texture Configuration
const textureConfig = {
    uEarthTexture: { url: "textures/earth.jpg", type: "1i", unit: 0 },
    uMoonTexture: { url: "textures/moon.jpg", type: "1i", unit: 1 },
}

// Orbit Configuration
const orbitConfig = {
    earth: {
        orbiter: earth, // Earth orbits around the Sun
        central: sun,
        orbitRadius: sun.radius + 10.0,
        orbitSpeed: orbitSpeeds.earth,
        options: { invert: true }
    },
    moon: {
        orbiter: moon, // Moon orbits around the Earth
        central: earth,
        orbitRadius: 3.0,
        orbitSpeed: orbitSpeeds.moon,
    }
};


export const sceneConfigs = {
    uniformConfig,
    textureConfig,
    orbitConfig
};
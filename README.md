# Solar System Visualization

## Overview

"Solar System Visualization" is a web-based graphical representation that meticulously models the solar system with an emphasis on the **Sun**, **Earth**, and **Moon**. This project leverages **WebGL** to create a visually stunning depiction of these celestial bodies, showcasing their dynamic interactions and the physical phenomena that characterize them.

## Features

- **Advanced Celestial Mechanics:** The simulation provides a real-time depiction of solar, lunar, and terrestrial dynamics, demonstrating their relative movements and interactions with precise accuracy. This feature utilizes complex mathematical models to simulate the gravitational effects and orbital mechanics that govern their behavior.

- **Detailed Surface Rendering:** Utilizing **high-resolution textures** and **procedural turbulence** techniques, this feature enhances the realism of celestial surfaces. The textures provide intricate surface details of the Sun, Earth, and Moon, while procedural turbulence adds a dynamic, ever-changing aspect to these surfaces, mimicking the fluid and gaseous movements seen in natural celestial bodies.

- **Dynamic Lighting and Shadows:** The project implements sophisticated lighting models that include **Phong shading**, **ambient lighting**, **diffuse reflection**, and **specular highlights**. These elements work together to recreate the natural lighting conditions found in space, enhancing the depth and realism of the scene. This dynamic lighting adjusts with the viewer's perspective, casting realistic shadows and creating highlights that change based on the relative positions of the Sun, Earth, and Moon.

- **Ray-Sphere Intersection:** This technical feature underpins the visualization's ability to render views from any perspective. Efficient **ray tracing** algorithms calculate the intersections of rays with the celestial bodies, determining visible surfaces and enabling the viewer to explore the solar system from different angles. This method is crucial for accurately portraying the three-dimensional aspects of the scene.

- **Atmospheric and Phenomenal Effects:** The simulation includes **atmospheric scattering** effects on Earth, which recreate how light is scattered by the Earth's atmosphere, resulting in realistic rendering of skies and horizons. Additionally, dynamic **corona effects** around the Sun simulate its luminous envelope, providing stunning visual effects during sunrise and sunset transitions, enhancing the overall visual appeal and realism of the simulation.

## Live Demo

Experience the Solar System Visualization live at [Solar System Visualization](https://tarynchiang.github.io/Solar-System-Visualization/).

## Installation

To run "Solar System Visualization" locally, follow these steps:

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/solar-system-visualization.git
   cd solar-system-visualization
   ```

export const FRAGMENT_SHADER_HEADER = `
  precision highp float;
  float noise(vec3 point) {
    float r = 0.;
    for (int i = 0; i < 16; i++) {
      vec3 D, p = point + mod(vec3(i, i / 4, i / 8), vec3(4.0, 2.0, 2.0)) + 1.7 * sin(vec3(i, 5 * i, 8 * i)),
          C = floor(p), P = p - C - .5, A = abs(P);
      C += mod(C.x + C.y + C.z, 2.) * step(max(A.yzx, A.zxy), A) * sign(P);
      D = 34. * sin(987. * float(i) + 876. * C + 76. * C.yzx + 765. * C.zxy);
      P = p - C - .5;
      r += sin(6.3 * dot(P, fract(D) - .5)) * pow(max(0., 1. - 2. * dot(P, P)), 4.);
    }
    return .5 * sin(r);
  }
`;



// Vertex Shader
export const vertexShaderSource = `
    precision highp float;

    attribute vec3 aPos;
    varying vec3 vPos;

    void main() {
        gl_Position = vec4(aPos, 1.0);
        vPos = aPos;
    }
`;


// Fragment Shader
export const fragmentShaderSource = `
  precision highp float;

  varying vec3 vPos;

  uniform vec3 uCameraPos;
  uniform vec3 uCameraDir;
  uniform vec3 uCameraUp;

  uniform vec2 uResolution;
  uniform float uTime;

  uniform vec3 uMoonPos;
  uniform float uMoonRadius;
  uniform vec3 uMoonColor;
  uniform sampler2D uMoonTexture; // Moon texture sampler


  uniform vec3 uSunPos;
  uniform float uSunRadius;
  uniform vec3 uSunColor;

  uniform vec3 uEarthPos;
  uniform float uEarthRadius;
  uniform vec3 uEarthColor;
  uniform sampler2D uEarthTexture; // Earth texture sampler

  struct CelestialBody {
    vec3 center;
    float radius;
    vec3 color;
  };  

  const float AXIAL_TILT = radians(23.5); // Convert degrees to radians
  float CORONA_RADIUS = uSunRadius + 1.5;


  // Function to compute the ray direction
  vec3 computeRayDirection(vec3 vPos) {
      // Normalize the x and y coordinates to NDC space [-1, 1]
      vec2 ndc = vPos.xy;

      // Adjust ndc.x for aspect ratio
      ndc.x *= uResolution.x / uResolution.y;

      // Field of view adjustment
      float fovScale = tan(radians(30.0));

      // Define camera basis vectors
      vec3 forward = normalize(uCameraDir);
      vec3 right = normalize(cross(forward, uCameraUp));
      vec3 up = cross(right, forward);

      // Compute ray direction
      vec3 rayDir = normalize(forward + ndc.x * fovScale * right + ndc.y * fovScale * up);

      return rayDir;
  }

  // Function to generate turbulence by summing multiple noise octaves
  float turbforSun(vec3 point, int octaves, float persistence, float lacunarity) {
      float value = 0.0;
      float amplitude = 1.0;
      float frequency = 1.0;

      for (int i = 0; i < 16; i++) { // Maximum of 16 iterations
          if (i >= octaves) {
              break;
          }
          value += amplitude * noise(point * frequency);
          amplitude *= persistence;
          frequency *= lacunarity;
      }

      return value;
  }

  float turbulence(vec3 P) {
    float f = 0., s = 1.;
    for (int i = 0 ; i < 4 ; i++) {
        f += abs(noise(s * P)) / s;
        s *= 2.;
        P = vec3(.866*P.x + .5*P.z, P.y + 100., -.5*P.x + .866*P.z);
    }
    return f;
  }

  bool intersectSphere(vec3 rayOrigin, vec3 rayDir, CelestialBody body, out float t) {
      vec3 oc = rayOrigin - body.center;
      float a = dot(rayDir, rayDir);
      float b = 2.0 * dot(oc, rayDir);
      float c = dot(oc, oc) - body.radius * body.radius;
      float discriminant = b * b - 4.0 * a * c;
      
      if (discriminant < 0.0) {
          return false;
      } else {
          t = (-b - sqrt(discriminant)) / (2.0 * a);
          if (t < 0.0) {
              t = (-b + sqrt(discriminant)) / (2.0 * a);
              if (t < 0.0) return false;
          }
          return true;
      }
  }

  // Function to compute UV coordinates from a normal vector
  vec2 computeUV(vec3 normal) {
      float longitude = atan(normal.z, normal.x);
      float latitude = asin(normal.y);
      
      // Normalize longitude and latitude to [0, 1]
      float u = (longitude + 3.14159265) / (2.0 * 3.14159265);
      float v = (latitude + 1.57079633) / (3.14159265);
      
      return vec2(u, v);
  }



  // Function to simulate the Sun's surface
  vec3 renderSun(vec3 rayOrigin, vec3 rayDir, CelestialBody body) {
    float t;

    if(intersectSphere(rayOrigin, rayDir, body, t)){
      // Ray hits the Sun
      vec3 hitPoint = rayOrigin + t * rayDir;
      vec3 normal = normalize(hitPoint - body.center);

      // // Calculate distance from center for glow effect
      float distFromCenter = length(hitPoint - body.center);

      // Larger-scale turbulence for uneven surface patches
      float turb = turbforSun(hitPoint + vec3(uTime * 0.05), 6, 0.7, 2.0);

      // Base noise layer for turbulent regions
      float noiseLayer = noise(hitPoint * 10.0 + vec3(uTime * 0.05)) * 0.01;

      // Combine the large-scale and small-scale noise to get plasma flow
      float plasmaFlow = noiseLayer + turb;

      // Base color of the Sun
      vec3 sunColor = vec3(1.0, 0.4, 0.2);

      // Combine plasma flow with the activity mask to make some areas more active
      vec3 plasmaColor = sunColor + vec3(0.4, 0.7, 0.3) * plasmaFlow;

      float sunspotMask = smoothstep(0.23, 0.22, noiseLayer);
      plasmaColor += mix(vec3(1.0, 0.1, 0.1), vec3(0.01), sunspotMask); 
      
      return clamp(plasmaColor, 0.0, 1.0);
    }

    return vec3(0.0); // Background color (black)
  }

  // Function to simulate the Moon's surface
  vec3 renderMoon(vec3 rayOrigin, vec3 rayDir, CelestialBody moon, CelestialBody earth) {
    // Sphere center and radius (Moon's properties)
    vec3 moonCenter = uMoonPos; // Passed as a uniform
    float moonRadius = uMoonRadius;  // Passed as a uniform

    float t;

    if(intersectSphere(rayOrigin, rayDir, moon, t)){
      // Ray hits the Moon
      vec3 hitPoint = rayOrigin + t * rayDir;
      vec3 normal = normalize(hitPoint - moonCenter);

      // Calculate distance from center for glow effect
      float distFromCenter = length(hitPoint - uMoonPos);

      // -------------------- Compute UV and Sample Texture --------------------

      vec2 uv = computeUV(normal);
      vec3 moonTextureColor = texture2D(uMoonTexture, uv).rgb;
      
      // Use the texture color as the base color
      vec3 moonColor = moonTextureColor;

      // -------------------- Compute UV and Sample Texture End--------------------

      
      // Light direction (from hit point to Sun)
      vec3 lightDir = normalize(uSunPos - hitPoint);
      
      // View direction (from hit point to camera)
      vec3 viewDir = normalize(uCameraPos - hitPoint);

      // Reflection direction
      vec3 reflectDir = reflect(-lightDir, normal);

      // ------------------- Shadow Check -------------------
      
      // Offset hit point slightly to prevent self-intersection
      float epsilon = 0.001;
      vec3 shadowRayOrigin = hitPoint + normal * epsilon;
      vec3 shadowRayDir = lightDir;
      
      float tShadow;
      bool hitEarthShadow = intersectSphere(shadowRayOrigin, shadowRayDir, earth, tShadow);
      
      // Compute distance from hit point to Sun
      float distanceToSun = length(uSunPos - hitPoint);
      
      // Determine if point is in shadow
      bool inShadow = hitEarthShadow && tShadow < distanceToSun;
      
      // ------------------- Shadow Check End-------------------

      // ------------------- Phong Shading -------------------

      vec3 ambient, diffuse, specular;

      if(inShadow){

        // In shadow: only ambient lighting
        float ambientStrength = 0.15;
        ambient = ambientStrength * moon.color;
        diffuse = vec3(0.0);
        specular = vec3(0.0);

      }else{
        // Ambient component
        float ambientStrength = 0.4;
        ambient = ambientStrength * moon.color;
        
        // Diffuse component
        float diff = max(dot(normal, lightDir), 0.0);
        diffuse = diff * moon.color;

        // Specular component
        float specularStrength = 1.0;
        float shininess = 32.0;
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
        specular = specularStrength * spec * vec3(1.0); // White specular highlights
      
      }
      
      // Combine Phong components
      vec3 phong = ambient + diffuse + specular;

      // ------------------- Phong Shading End-------------------


      // ------------------- Surface Detail with Noise -------------------

      // Add subtle glow using exponential falloff, centered on the Moon's surface
      float glowIntensity = exp(-pow((distFromCenter - moonRadius) / 0.3, 2.0)) * 0.4; // Even more subdued glow
      vec3 glowColor = vec3(0.5, 0.5, 0.5) * glowIntensity; // Consistent Gray Glow
  
      
      // Apply surface detail to Phong shading
      vec3 finalColor = phong * moonColor + glowColor;


      // ------------------- Surface Detail with Noise End-------------------
  
      return finalColor;
    }

    return vec3(0.0); // Background color (black)
  }

  // Function to create a rotation matrix around the X-axis for axial tilt
  mat3 rotationX(float angle) {
      float c = cos(angle);
      float s = sin(angle);
      return mat3(
          1.0, 0.0, 0.0,
          0.0, c, -s,
          0.0, s, c
      );
  }


  // Function to simulate the Earth's surface
  vec3 renderEarth(vec3 rayOrigin, vec3 rayDir, CelestialBody body, CelestialBody moon) {
      float t;
      if(intersectSphere(rayOrigin, rayDir, body, t)){
        // Ray hits the Earth
        vec3 hitPoint = rayOrigin + t * rayDir;
        vec3 normal = normalize(hitPoint - uEarthPos);

        // -------------------- Axial Tilt Rotation --------------------

        // Create axial tilt rotation matrix
        mat3 tiltMatrix = rotationX(AXIAL_TILT);
        
        // Rotate the normal vector to apply axial tilt
        vec3 tiltedNormal = tiltMatrix * normal;

        // -------------------- Axial Tilt Rotation End--------------------


        // -------------------- Compute UV and Sample Texture --------------------

        vec2 uv = computeUV(tiltedNormal);
        vec3 earthTextureColor = texture2D(uEarthTexture, uv).rgb;
        
        // Use the texture color as the base color
        vec3 earthColor = earthTextureColor;

        // -------------------- Compute UV and Sample Texture End--------------------

        // ------------------- Shadow Check from Moon -------------------

        // Offset the hit point slightly to prevent self-intersection
        float epsilon = 0.001;
        vec3 shadowRayOrigin = hitPoint + normal * epsilon;
        vec3 lightDir = normalize(uSunPos - hitPoint); // Ray from Earth towards the Sun

        // Check if the point is on the lit side of the Earth
        float sunDot = dot(tiltedNormal, lightDir);

        // Only check for shadows if the point is on the lit side of the Earth (sunDot > 0)
        bool inShadow = false;
        if (sunDot > 0.0) {
            // Ray from the Earth towards the Sun intersects the Moon
            float tShadow;
            bool hitMoonShadow = intersectSphere(shadowRayOrigin, lightDir, moon, tShadow);

            // Compute the distance from the hit point to the Sun
            float distanceToSun = length(uSunPos - hitPoint);

            // Determine if the point on Earth is in shadow (if Moon obstructs the Sun)
            inShadow = hitMoonShadow && tShadow < distanceToSun;
        }

        // -------------------- Shadow Check End --------------------

          
        // ------------------- Phong Shading -------------------

        // View direction
        vec3 viewDir = normalize(uCameraPos - hitPoint);
        
        // Reflection direction
        vec3 reflectDir = reflect(-lightDir, tiltedNormal);
        
        vec3 ambient, diffuse, specular;

        // ambient lighting
        float ambientStrength = 0.6;
        ambient = ambientStrength * earthColor;

        if (inShadow) {
            diffuse = vec3(0.0);
            specular = vec3(0.0);
        } else { 
          // Diffuse component
          float diff = max(dot(tiltedNormal, lightDir), 0.0);
          float diffuseStrength = 10.0;

          diffuse = diffuseStrength * diff * body.color;
          
          // Specular component
          float specularStrength = 0.5;
          float shininess = 32.0;
          float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
          specular = specularStrength * spec * vec3(1.0); // White specular highlights
        }

        // Combine Phong components
        vec3 phong = ambient + diffuse + specular;

        // ------------------- Phong Shading End-------------------

        // Combine shading with surface color
        vec3 finalColor = phong * earthColor;
          
        // Clamp the final color
        finalColor = clamp(finalColor, 0.0, 1.0);
        
        return finalColor;
      }
      
    return vec3(0.0); // Background color (black)
  }

  void main() {
    // Compute ray direction
    vec3 rayOrigin = uCameraPos;
    vec3 rayDir = computeRayDirection(vPos);

    // Define the Sun and Moon as CelestialBody structs
    CelestialBody sun;
    sun.center = uSunPos;
    sun.radius = uSunRadius;
    sun.color = uSunColor; // Orange
    
    CelestialBody moon;
    moon.center = uMoonPos;
    moon.radius = uMoonRadius;
    moon.color = uMoonColor; // Gray

    CelestialBody earth;
    earth.center = uEarthPos;
    earth.radius = uEarthRadius;
    earth.color = uEarthColor; // Blue

    // Find intersections
    float tSun, tMoon, tEarth;
    bool hitSun = intersectSphere(rayOrigin, rayDir, sun, tSun);
    bool hitMoon = intersectSphere(rayOrigin, rayDir, moon, tMoon);
    bool hitEarth = intersectSphere(rayOrigin, rayDir, earth, tEarth);


    float closestT = 1e20;
    vec3 color = vec3(0.0); // Background color

    // Check Sun intersection
    if (hitSun && tSun < closestT) {
        closestT = tSun;
        color = renderSun(rayOrigin, rayDir, sun);
    } else {
      // If no Sun intersection, check if the ray is within the corona range
      float tClosest = dot(sun.center - rayOrigin, rayDir) / dot(rayDir, rayDir);
      vec3 closestPoint = rayOrigin + tClosest * rayDir;

      float distFromSunCenter = length(closestPoint - sun.center);

      // Soft transition region for the Sun's surface
      float softSurfaceRadius = sun.radius + 0.0001; // Expand the Sun's surface for blending
      // Blend Sun surface and corona if within soft surface range
      if (distFromSunCenter > sun.radius && distFromSunCenter < CORONA_RADIUS) {
          // Normalize the glow factor to scale based on corona radius
          float glowFactor = (distFromSunCenter - uSunRadius) / (CORONA_RADIUS - uSunRadius);

          // Use smoothstep to blend the surface and the corona smoothly
          float surfaceBlendFactor = smoothstep(sun.radius, softSurfaceRadius, distFromSunCenter);

          // Exponential falloff for the corona glow
          float outerCoronaGlow = exp(-pow(glowFactor * 2.0, 2.0)) * 10.0;

          // Add turbulence to make the corona dynamic
          vec3 turbulencePoint = closestPoint + vec3(0.2, uTime * 0.2, 0.0); // Animate turbulence
          float turbFactor = turbulence(turbulencePoint * 0.2); // Scale turbulence

          // Modulate the corona glow intensity with turbulence and surface blend
          outerCoronaGlow *= turbFactor * surfaceBlendFactor;

          // Final color blending between Sun surface and corona
          vec3 sunColor = vec3(1.0, 0.4, 0.2); // Sun surface color
          vec3 coronaColor = vec3(1.0, 0.4, 0.2) * outerCoronaGlow; // Corona glow color

          // Mix the surface and corona colors based on the blend factor
          color = mix(sunColor, coronaColor, surfaceBlendFactor);
      }
    
    }

    // Check Earth intersection
    if (hitEarth && tEarth < closestT) {
        closestT = tEarth;
        color = renderEarth(rayOrigin, rayDir, earth, moon);
    }

    // Check Moon intersection
    if (hitMoon && tMoon < closestT) {
        closestT = tMoon;
        color = renderMoon(rayOrigin, rayDir, moon, earth);
    }


    gl_FragColor = vec4(color, 1.0);
  }
`;

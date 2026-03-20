export function editScene(scene: any, prompt: string) {
  const lower = prompt.toLowerCase();

  // 🧠 CLONE (avoid mutation issues)
  const updated = JSON.parse(JSON.stringify(scene));

  // 🎨 BACKGROUND / STYLE
  if (lower.includes("dark")) {
    updated.environment.background.value = "#0a0a0a";
    updated.metadata.style = "dark";
  }

  if (lower.includes("light")) {
    updated.environment.background.value = "#ffffff";
    updated.metadata.style = "minimal";
  }

  // 💎 MATERIAL CHANGES
  if (lower.includes("metal")) {
    updated.objects.forEach((obj: any) => {
      obj.material = {
        type: "metal",
        color: "#dddddd",
        metalness: 0.8,
        roughness: 0.2
      };
    });
  }

  if (lower.includes("glass")) {
    updated.objects.forEach((obj: any) => {
      obj.material = {
        type: "glass",
        color: "#ffffff",
        roughness: 0.1
      };
    });
  }

  // 🎞️ ANIMATION
  if (lower.includes("rotate")) {
    updated.animations = [
      {
        id: crypto.randomUUID(),
        target: updated.objects[0].id,
        type: "rotation",
        axis: "y",
        speed: 0.5,
        loop: true
      }
    ];
  }

  if (lower.includes("float")) {
    updated.animations = [
      {
        id: crypto.randomUUID(),
        target: updated.objects[0].id,
        type: "float",
        speed: 0.3,
        loop: true
      }
    ];
  }

  // 📍 POSITION CHANGES
  if (lower.includes("move up")) {
    updated.objects[0].position[1] += 1;
  }

  if (lower.includes("move down")) {
    updated.objects[0].position[1] -= 1;
  }

  if (lower.includes("left")) {
    updated.objects[0].position[0] -= 1;
  }

  if (lower.includes("right")) {
    updated.objects[0].position[0] += 1;
  }

  return updated;
}
export function optimizeScene(scene: any, target: "desktop" | "mobile") {
  const updated = JSON.parse(JSON.stringify(scene));

  let warnings: string[] = [];

  // 🎯 LIMIT OBJECT COUNT
  const MAX_OBJECTS = target === "mobile" ? 2 : 3;

  if (updated.objects.length > MAX_OBJECTS) {
    updated.objects = updated.objects.slice(0, MAX_OBJECTS);
    warnings.push("Reduced object count for performance");
  }

  // 🎨 SIMPLIFY MATERIALS
  updated.objects.forEach((obj: any) => {
    if (obj.material?.type === "metal") {
      obj.material.metalness = 0.5;
      obj.material.roughness = 0.5;
    }

    if (obj.material?.type === "glass") {
      obj.material.roughness = 0.3;
    }
  });

  // 💡 REDUCE LIGHTING
  if (updated.lighting.length > 1) {
    updated.lighting = [updated.lighting[0]]; // keep ambient only
    warnings.push("Reduced lighting complexity");
  }

  // 📦 REMOVE HEAVY ANIMATIONS (basic rule)
  if (target === "mobile" && updated.animations.length > 0) {
    updated.animations[0].speed *= 0.5;
    warnings.push("Reduced animation speed for mobile");
  }

  // 🎯 PERFORMANCE ESTIMATION
  const objectCount = updated.objects.length;
  let performance = "good";

  if (objectCount > 3) performance = "moderate";
  if (objectCount > 5) performance = "poor";

  const metrics = {
    target,
    object_count: objectCount,
    lighting_count: updated.lighting.length,
    performance,
    warnings
  };

  return {
    scene: updated,
    metrics
  };
}
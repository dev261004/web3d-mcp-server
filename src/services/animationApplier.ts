export function applyAnimation(scene: any, type: string) {
  const updated = JSON.parse(JSON.stringify(scene));

  const mainObject = updated.objects[0];

  if (!mainObject) return updated;

  let animation = null;

  if (type === "rotation") {
    animation = {
      id: crypto.randomUUID(),
      target: mainObject.id,
      type: "rotation",
      axis: "y",
      speed: 0.5,
      loop: true
    };
  }

  if (type === "float") {
    animation = {
      id: crypto.randomUUID(),
      target: mainObject.id,
      type: "float",
      speed: 0.3,
      loop: true
    };
  }

  if (type === "bounce") {
    animation = {
      id: crypto.randomUUID(),
      target: mainObject.id,
      type: "bounce",
      speed: 0.6,
      loop: true
    };
  }

  updated.animations = animation ? [animation] : [];

  return updated;
}
export interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

/**
 * Tracks WASD / arrow key held state.
 * Ignores input when focus is on an <input> or <textarea>.
 * Clears all keys on window blur (tab switch).
 */
export function createKeyboardTracker(): KeyState {
  const keys: KeyState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };

  function isTyping(e: KeyboardEvent): boolean {
    const tag = (e.target as HTMLElement)?.tagName;
    return tag === "INPUT" || tag === "TEXTAREA";
  }

  function setKey(code: string, value: boolean): void {
    switch (code) {
      case "KeyW":
      case "ArrowUp":
        keys.forward = value;
        break;
      case "KeyS":
      case "ArrowDown":
        keys.backward = value;
        break;
      case "KeyA":
      case "ArrowLeft":
        keys.left = value;
        break;
      case "KeyD":
      case "ArrowRight":
        keys.right = value;
        break;
    }
  }

  window.addEventListener("keydown", (e) => {
    if (isTyping(e)) return;
    setKey(e.code, true);
  });

  window.addEventListener("keyup", (e) => {
    if (isTyping(e)) return;
    setKey(e.code, false);
  });

  window.addEventListener("blur", () => {
    keys.forward = false;
    keys.backward = false;
    keys.left = false;
    keys.right = false;
  });

  return keys;
}

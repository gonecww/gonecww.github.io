#include <emscripten/emscripten.h>

extern "C" {
  EMSCRIPTEN_KEEPALIVE
  int fade_value(int x, int amount) {
    // simple example: apply a soft clamp used in animation math
    int v = x + amount;
    if (v < 0) v = 0;
    if (v > 255) v = 255;
    return v;
  }

  EMSCRIPTEN_KEEPALIVE
  int add_ints(int a, int b) {
    return a + b;
  }
}

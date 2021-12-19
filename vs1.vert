attribute vec3 vert;
attribute vec4 color;
uniform mat4 mvpMatrix;
uniform float time;
varying vec4 vColor;

void main() {

    gl_Position = mvpMatrix * vec4(vert, 1.0);

    vColor = color;

    gl_PointSize = 3.0;
}
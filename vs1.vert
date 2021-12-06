attribute vec3 circle;
attribute vec4 color;
uniform mat4 mvpMatrix;
uniform float time;
varying vec4 vColor;

void main() {

    

    gl_Position = mvpMatrix * vec4(circle, 1.0);

    vColor = color;

    gl_PointSize = 10.0;
}
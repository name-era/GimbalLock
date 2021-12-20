
let isFace = false;
let alpha = 0;
let beta = 0;
let gamma = 0;

window.addEventListener('DOMContentLoaded', () => {

    const PANE = new Tweakpane({
        container: document.querySelector('#pane'),
    });



    const webgl = new WebGLFrame();
    webgl.init('webgl-canvas');
    webgl.load().then(() => {
        webgl.setUp();

        PANE.addInput({ alpha: alpha }, 'alpha', { step: 1, min: 0, max: 360 })
            .on('change', (v) => {
                alpha = v;
                webgl.camera.rotate('x');
            });

        PANE.addInput({ beta: beta }, 'beta', { step: 1, min: 0, max: 360 })
            .on('change', (v) => {
                beta = v;
                webgl.camera.rotate('y');
            });

        PANE.addInput({ gamma: gamma }, 'gamma', { step: 1, min: 0, max: 360 })
            .on('change', (v) => {
                gamma = v;
                webgl.camera.rotate('z');
            });

        webgl.render();
    });
}, false);

class WebGLFrame {

    constructor() {
        this.canvas = null;
        this.gl = null;
        this.running = false;
        this.beginTime = 0;
        this.nowTime = 0;
        this.render = this.render.bind(this);

        this.camera = new InteractionCamera();

        this.mMatrix = glMatrix.mat4.create();
        this.vMatrix = glMatrix.mat4.create();
        this.pMatrix = glMatrix.mat4.create();
        this.vpMatrix = glMatrix.mat4.create();
        this.mvpMatrix = glMatrix.mat4.create();

    }

    //初期化
    init(canvas) {
        if (canvas instanceof HTMLCanvasElement === true) {
            this.canvas = canvas;
        }
        else if (Object.prototype.toString.call(canvas) === '[object String]') {
            //文字列の場合
            const c = document.querySelector(`#${canvas}`);
            if (c instanceof HTMLCanvasElement === true) {
                this.canvas = c;
            }
        }

        if (this.canvas == null) {
            throw new Error('invalid argument');
        }

        this.gl = this.canvas.getContext('webgl');
        if (this.gl == null) {
            throw new Error('webgl not supported');
        }
    }

    load() {
        this.program = null;
        this.attLocation = null;
        this.attStride = null;
        this.uniLocation = null;
        this.uniType = null;

        return new Promise((resolve) => {
            this.loadShadedr([
                './vs1.vert',
                './fs1.frag',
            ])
                .then((shaders) => {
                    const gl = this.gl;
                    const vs = this.createShader(shaders[0], gl.VERTEX_SHADER);
                    const fs = this.createShader(shaders[1], gl.FRAGMENT_SHADER);

                    this.program = this.createProgram(vs, fs);

                    this.attLocation = [
                        gl.getAttribLocation(this.program, 'vert'),
                        gl.getAttribLocation(this.program, 'color'),
                    ];
                    this.attStride = [
                        3,
                        4,
                    ];
                    this.uniLocation = [
                        gl.getUniformLocation(this.program, 'mvpMatrix'),
                        gl.getUniformLocation(this.program, 'time'),
                    ];
                    this.uniType = [
                        'uniformMatrix4fv',
                        'uniform1f',
                    ];

                    resolve();
                })
        })
    }

    loadShadedr(pathArray) {
        if (Array.isArray(pathArray) != true) {
            throw new Error('invalid argument');
        }
        const promises = pathArray.map((path) => {
            return fetch(path).then((response) => { return response.text(); })
        });
        return Promise.all(promises);
    }

    createShader(source, type) {
        if (this.gl == null) {
            throw new Error('webgl not initializedd');
        }

        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            return shader;
        } else {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }

    }

    createProgram(vs, fs) {
        if (this.gl == null) {
            throw new Error('webgl not initialized');
        }
        const gl = this.gl;
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.useProgram(program);
            return program;
        } else {
            alert(gl.getProgramInfoLog(program));
            return null;
        }
    }

    setUp() {

        const gl = this.gl;

        this.mouseX = 0;
        this.mouseY = 0;

        window.addEventListener('keydown', (evt) => {
            this.running = evt.key !== 'Escape';
        }, false);

        this.camera.update();
        this.canvas.addEventListener('mousedown', this.camera.startEvent, false);
        //this.canvas.addEventListener('mousemove', this.camera.moveEvent, false);
        this.canvas.addEventListener('mouseup', this.camera.endEvent, false);
        this.canvas.addEventListener('wheel', this.camera.wheelEvent, false);

        const TORUS_VERTEX_COUNT = 50;
        const INNER_VERTEX_COUNT = 20;
        const LINE_VERTEX_COUNT = 2;
        const VERTEX_RADIUSX = 0.8;
        const VERTEX_RADIUSY = 0.9;
        const VERTEX_RADIUSZ = 1.0;
        const INNER_RADIUS = 0.02;

        //円
        this.circleX = [];
        this.circleY = [];
        this.circleZ = [];

        this.circleColorX = [];
        this.circleColorY = [];
        this.circleColorZ = [];

        this.circleIndex = [];

        //ギズモ
        this.lineX = [];
        this.lineY = [];
        this.lineZ = [];

        this.minusLineX = [];
        this.minusLineY = [];
        this.minusLineZ = [];

        this.lineColorX = [];
        this.lineColorY = [];
        this.lineColorZ = [];

        this.lineIndex = [];

        for (let i = 0; i <= TORUS_VERTEX_COUNT; ++i) {

            const iRad = (i / TORUS_VERTEX_COUNT) * Math.PI * 2.0;

            const sint = Math.sin(iRad);
            const cost = Math.cos(iRad);


            for (let j = 0; j <= INNER_VERTEX_COUNT; j++) {
                const jRad = (j / INNER_VERTEX_COUNT) * Math.PI * 2.0;
                const sinp = Math.sin(jRad);
                const cosp = Math.cos(jRad);

                //円
                this.circleX.push(
                    VERTEX_RADIUSX * cost + INNER_RADIUS * cosp * cost,
                    INNER_RADIUS * sinp,
                    VERTEX_RADIUSX * sint + INNER_RADIUS * cosp * sint,
                );

                this.circleY.push(
                    VERTEX_RADIUSY * sint + INNER_RADIUS * cosp * sint,
                    VERTEX_RADIUSY * cost + INNER_RADIUS * cosp * cost,
                    INNER_RADIUS * sinp,
                );

                this.circleZ.push(
                    INNER_RADIUS * sinp,
                    VERTEX_RADIUSZ * sint + INNER_RADIUS * cosp * sint,
                    VERTEX_RADIUSZ * cost + INNER_RADIUS * cosp * cost,
                );


                this.circleColorX.push(1.0, 0.0, 0.0, 1.0);
                this.circleColorY.push(0.0, 1.0, 0.0, 1.0);
                this.circleColorZ.push(0.0, 0.0, 1.0, 1.0);

                if (i > 0 && j > 0) {

                    const firstColumn = (i - 1) * (INNER_VERTEX_COUNT + 1) + j;
                    const secoudColumn = i * (INNER_VERTEX_COUNT + 1) + j;

                    this.circleIndex.push(
                        firstColumn - 1, firstColumn, secoudColumn - 1
                        , secoudColumn - 1, firstColumn, secoudColumn
                    );
                }
            }
        }

        for (let i = 0; i <= LINE_VERTEX_COUNT; i++) {
            for (let j = 0; j <= INNER_VERTEX_COUNT; j++) {
                const jRad = (j / INNER_VERTEX_COUNT) * Math.PI * 2.0;
                const sin = Math.sin(jRad);
                const cos = Math.cos(jRad);

                this.lineX.push(
                    i / 20.0 + 0.8,
                    INNER_RADIUS * cos,
                    INNER_RADIUS * sin,
                );

                this.lineY.push(
                    INNER_RADIUS * sin,
                    i / 20.0 + 0.9,
                    INNER_RADIUS * cos,
                );

                this.lineZ.push(
                    INNER_RADIUS * cos,
                    INNER_RADIUS * sin,
                    i / 20.0 + 1.0,
                );

                this.lineColorX.push(1.0, 0.0, 0.0, 1.0);
                this.lineColorY.push(0.0, 1.0, 0.0, 1.0);
                this.lineColorZ.push(0.0, 0.0, 1.0, 1.0);

                if (i > 0 && j > 0) {

                    const firstColumn = (i - 1) * (INNER_VERTEX_COUNT + 1) + j;
                    const secoudColumn = i * (INNER_VERTEX_COUNT + 1) + j;

                    this.lineIndex.push(
                        firstColumn - 1, firstColumn, secoudColumn - 1
                        , secoudColumn - 1, firstColumn, secoudColumn
                    );
                }
            }
        }

        for (let i = 0; i <= LINE_VERTEX_COUNT; i++) {
            for (let j = 0; j <= INNER_VERTEX_COUNT; j++) {
                const jRad = (j / INNER_VERTEX_COUNT) * Math.PI * 2.0;
                const sin = Math.sin(jRad);
                const cos = Math.cos(jRad);

                this.minusLineX.push(
                    -i / 20.0 - 0.8,
                    INNER_RADIUS * cos,
                    INNER_RADIUS * sin,
                );

                this.minusLineY.push(
                    INNER_RADIUS * sin,
                    -i / 20.0 - 0.9,
                    INNER_RADIUS * cos,
                );

                this.minusLineZ.push(
                    INNER_RADIUS * cos,
                    INNER_RADIUS * sin,
                    -i / 20.0 - 1.0,
                );
            }
        }

        this.vboX = [
            this.createVbo(this.circleX),
            this.createVbo(this.circleColorX),
        ]

        this.vboY = [
            this.createVbo(this.circleY),
            this.createVbo(this.circleColorY),
        ]

        this.vboZ = [
            this.createVbo(this.circleZ),
            this.createVbo(this.circleColorZ),
        ]

        this.ibo = this.createIbo(this.circleIndex);

        this.lineVboX = [
            this.createVbo(this.lineX),
            this.createVbo(this.lineColorX),
        ]

        this.lineVboY = [
            this.createVbo(this.lineY),
            this.createVbo(this.lineColorY),
        ]

        this.lineVboZ = [
            this.createVbo(this.lineZ),
            this.createVbo(this.lineColorZ),
        ]

        this.minusLineVboX = [
            this.createVbo(this.minusLineX),
            this.createVbo(this.lineColorX),
        ]

        this.minusLineVboY = [
            this.createVbo(this.minusLineY),
            this.createVbo(this.lineColorY),
        ]

        this.minusLineVboZ = [
            this.createVbo(this.minusLineZ),
            this.createVbo(this.lineColorZ),
        ]

        this.lineIbo = this.createIbo(this.lineIndex);


        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);

        this.running = true;
        this.beginTime = Date.now();
    }

    createVbo(data) {
        if (this.gl == null) {
            throw new Error('webgl not initialized');
        }
        const gl = this.gl;
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return vbo;
    }

    createIbo(data) {
        if (this.gl == null) {
            throw new Error('webgl not initialized');
        }
        const gl = this.gl;
        const ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        return ibo;
    }

    createIboInt(data) {
        if (this.gl == null) {
            throw new Error('webgl not initialized');
        }
        const gl = this.gl;
        if (ext == null || ext.elementIndexUint == null) {
            throw new Error('element index Uint not supported');
        }
        const ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        return ibo;
    }

    render() {
        const gl = this.gl;

        if (this.running === true) {
            requestAnimationFrame(this.render);
        }

        if (this.nowTime > 14) {
            this.beginTime = Date.now();
        }

        this.nowTime = (Date.now() - this.beginTime) / 1000;

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.program);



        const cameraPosition = [2.0, 2.0, 1.0];
        const centerPoint = [0.0, 0.0, 0.0];
        const cameraUpDirection = [0.0, 0.0, 1.0];
        const fovy = 60 * this.camera.scale * Math.PI / 180.0; //Field of view Y
        const aspect = this.canvas.width / this.canvas.height;
        const near = 0.1;
        const far = 10.0;

        //view
        glMatrix.mat4.lookAt(this.vMatrix, cameraPosition, centerPoint, cameraUpDirection);

        //projection
        glMatrix.mat4.perspective(this.pMatrix, fovy, aspect, near, far);
        glMatrix.mat4.multiply(this.vpMatrix, this.pMatrix, this.vMatrix);

        this.camera.update();
        //glMatrix.mat4.fromQuat(quaternionMatrix, this.camera.qtn);

        //z
        glMatrix.mat4.multiply(this.mvpMatrix, this.vpMatrix, this.camera.eulerZ);

        this.setUniform([
            this.mvpMatrix,
            this.nowTime,
        ], this.uniLocation, this.uniType);

        this.setAttribute(this.vboZ, this.attLocation, this.attStride, this.ibo);
        gl.drawElements(gl.TRIANGLES, this.circleIndex.length, gl.UNSIGNED_SHORT, 0);

        this.setAttribute(this.lineVboZ, this.attLocation, this.attStride, this.lineIbo);
        gl.drawElements(gl.TRIANGLES, this.lineIndex.length, gl.UNSIGNED_SHORT, 0);

        this.setAttribute(this.minusLineVboZ, this.attLocation, this.attStride, this.lineIbo);
        gl.drawElements(gl.TRIANGLES, this.lineIndex.length, gl.UNSIGNED_SHORT, 0);

        //y
        let rotateY = glMatrix.mat4.create();
        glMatrix.mat4.multiply(rotateY, this.camera.eulerZ, this.camera.eulerY);
        glMatrix.mat4.multiply(this.mvpMatrix, this.vpMatrix, rotateY);

        this.setUniform([
            this.mvpMatrix,
            this.nowTime,
        ], this.uniLocation, this.uniType);

        this.setAttribute(this.vboY, this.attLocation, this.attStride, this.ibo);
        gl.drawElements(gl.TRIANGLES, this.circleIndex.length, gl.UNSIGNED_SHORT, 0);

        this.setAttribute(this.lineVboY, this.attLocation, this.attStride, this.lineIbo);
        gl.drawElements(gl.TRIANGLES, this.lineIndex.length, gl.UNSIGNED_SHORT, 0);

        this.setAttribute(this.minusLineVboY, this.attLocation, this.attStride, this.lineIbo);
        gl.drawElements(gl.TRIANGLES, this.lineIndex.length, gl.UNSIGNED_SHORT, 0);

        //x
        let rotateX = glMatrix.mat4.create();
        glMatrix.mat4.multiply(rotateX, this.camera.eulerZ, this.camera.eulerY);
        glMatrix.mat4.multiply(rotateX, rotateX, this.camera.eulerX);
        glMatrix.mat4.multiply(this.mvpMatrix, this.vpMatrix, rotateX);

        this.setUniform([
            this.mvpMatrix,
            this.nowTime,
        ], this.uniLocation, this.uniType);

        this.setAttribute(this.vboX, this.attLocation, this.attStride, this.ibo);
        gl.drawElements(gl.TRIANGLES, this.circleIndex.length, gl.UNSIGNED_SHORT, 0);

        this.setAttribute(this.lineVboX, this.attLocation, this.attStride, this.lineIbo);
        gl.drawElements(gl.TRIANGLES, this.lineIndex.length, gl.UNSIGNED_SHORT, 0);

        this.setAttribute(this.minusLineVboX, this.attLocation, this.attStride, this.lineIbo);
        gl.drawElements(gl.TRIANGLES, this.lineIndex.length, gl.UNSIGNED_SHORT, 0);




    }

    setAttribute(vbo, attL, attS, ibo) {
        if (this.gl == null) {
            throw new Error('webgl not initialized');
        }
        const gl = this.gl;
        vbo.forEach((v, index) => {
            gl.bindBuffer(gl.ARRAY_BUFFER, v);
            gl.enableVertexAttribArray(attL[index]);
            gl.vertexAttribPointer(attL[index], attS[index], gl.FLOAT, false, 0, 0);
        });
        if (ibo != null) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        }

    }

    setUniform(value, uniL, uniT) {
        if (this.gl == null) {
            throw new Error('webgl not initialized');
        }
        const gl = this.gl;
        value.forEach((v, index) => {
            const type = uniT[index];
            if (type.includes('Matrix') === true) {
                gl[type](uniL[index], false, v);
            } else {
                gl[type](uniL[index], v);
            }
        });
    }



}

class InteractionCamera {
    constructor() {
        this.qtn = glMatrix.quat.create();
        this.dragging = false;
        this.prevMouse = [0, 0];
        this.rotationScale = Math.min(window.innerWidth, window.innerHeight);
        this.rotation = 0.0;
        this.rotateAxis = [1.0, 0.0, 0.0];
        this.rotatePower = 2.0;
        this.rotateAttenuation = 0.9;
        this.scale = 1.0;
        this.scalePower = 0.0;
        this.scaleAtternuation = 0.8;
        this.scaleMin = 0.25;
        this.scaleMax = 2.0;
        this.startEvent = this.startEvent.bind(this);
        this.moveEvent = this.moveEvent.bind(this);
        this.endEvent = this.endEvent.bind(this);
        this.wheelEvent = this.wheelEvent.bind(this);

        //オイラー角用
        this.rotateAxisX = [1.0, 0.0, 0.0];
        this.rotateAxisY = [0.0, 1.0, 0.0];
        this.rotateAxisZ = [0.0, 0.0, 1.0];

        this.x = 0.0;
        this.y = 0.0;
        this.z = 0.0;

        this.eulerX = glMatrix.mat4.create();
        this.eulerY = glMatrix.mat4.create();
        this.eulerZ = glMatrix.mat4.create();
    }

    startEvent(eve) {
        this.dragging = true;
        this.prevMouse = [eve.clientX, eve.clientY];
    }

    moveEvent(eve) {
        if (this.dragging != true) { return; }
        const x = this.prevMouse[0] - eve.clientX;
        const y = this.prevMouse[1] - eve.clientY;
        this.rotation = Math.sqrt(x * x + y * y) / this.rotationScale * this.rotatePower;
        this.rotateAxis[0] = y;
        this.rotateAxis[1] = x;
        this.prevMouse = [eve.clientX, eve.clientY];
    }

    endEvent() {
        this.dragging = false;
    }

    wheelEvent(eve) {
        const w = eve.wheelDelta;
        const s = this.scaleMin * 0.1;
        if (w > 0) {
            this.scalePower = -s;
        } else if (w < 0) {
            this.scalePower = s;
        }
    }

    rotate(state) {

        //UIによる回転角の変更
        if (state == 'x') {
            glMatrix.mat4.rotate(this.eulerX, this.eulerX, alpha / 180.0 * Math.PI - this.x, this.rotateAxisX);
            this.x = alpha / 180.0 * Math.PI;

            return;
        }

        if (state == 'y') {
            glMatrix.mat4.rotate(this.eulerY, this.eulerY, beta / 180.0 * Math.PI - this.y, this.rotateAxisY);
            this.y = beta / 180.0 * Math.PI;

            return;
        }

        if (state == 'z') {
            glMatrix.mat4.rotate(this.eulerZ, this.eulerZ, gamma / 180 * Math.PI - this.z, this.rotateAxisZ);
            this.z = gamma / 180.0 * Math.PI;
            return;
        }
    }


    update() {

        this.scalePower *= this.scaleAtternuation;
        this.scale = Math.max(this.scaleMin, Math.min(this.scaleMax, this.scale + this.scalePower));

        // if (this.rotation === 0.0) { return; }
        // this.rotation *= this.rotateAttenuation;
        // glMatrix.vec3.normalize(this.rotateAxis, this.rotateAxis);
        // const q = glMatrix.quat.create();
        // glMatrix.quat.setAxisAngle(q, this.rotateAxis, this.rotation);
        //現在のクォータニオンに対して更に回転する
        //glMatrix.quat.multiply(this.qtn, this.qtn, q);
    }
}
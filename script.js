const containerEl = document.querySelector(".container");
const canvasEl = document.querySelector("canvas#neuro");
const devicePixelRatio = Math.min(window.devicePixelRatio, 2);

const pointer = {
    x: 0,
    y: 0,
    tX: 0,
    tY: 0,
};

let uniforms;
const gl = initShader();

setupEvents();

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const performanceOptions = {
    devicePixelRatio: Math.min(window.devicePixelRatio, 2),
    animationFrame: null,
    isVisible: true
};

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

const handleScroll = throttle(() => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}, 100);

window.addEventListener('scroll', handleScroll);

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

const observerOptions = {
    threshold: 0.25
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
            observer.unobserve(entry.target); // Only animate once
        }
    });
}, observerOptions);

document.querySelectorAll('section').forEach(section => {
    observer.observe(section);
});

render();

function setupNeuralProgress() {
    const scrollProgress = document.querySelector('.scroll-progress');
    const neurons = document.createElement('div');
    neurons.className = 'scroll-neurons';

    const neuronCount = Math.floor(window.innerWidth / 200); // One neuron every 200px
    for (let i = 0; i < neuronCount; i++) {
        const neuron = document.createElement('div');
        neuron.className = 'neuron';
        neuron.style.left = `${(i + 1) * (100 / (neuronCount + 1))}%`;
        neuron.style.animationDelay = `${i * 0.3}s`;
        neurons.appendChild(neuron);
    }

    scrollProgress.appendChild(neurons);
}

function updateScrollProgress() {
    const winScroll = document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;

    const progressBar = document.querySelector('.scroll-progress-bar');
    progressBar.style.width = `${scrolled}%`;

    if (gl && uniforms.u_scroll_progress) {
        gl.uniform1f(uniforms.u_scroll_progress, scrolled / 100);
    }

    const neurons = document.querySelectorAll('.neuron');
    neurons.forEach((neuron, index) => {
        const neuronPos = parseInt(neuron.style.left) || 0;
        if (neuronPos <= scrolled) {
            neuron.style.opacity = '1';
            neuron.style.transform = 'translateY(-50%) scale(1.2)';
        } else {
            neuron.style.opacity = '0.3';
            neuron.style.transform = 'translateY(-50%) scale(1)';
        }
    });
}

function updateActiveNavLink() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links a');

    let current = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 100) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
}

window.addEventListener('scroll', () => {
    requestAnimationFrame(() => {
        updateScrollProgress();
        updateActiveNavLink();
    });
});

document.querySelectorAll('.nav-links a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetSection = document.querySelector(targetId);

        window.scrollTo({
            top: targetSection.offsetTop - 70, // Adjust offset based on navbar height
            behavior: 'smooth'
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    setupNeuralProgress();
    updateScrollProgress();
    updateActiveNavLink();
});


class TextScramble {
    constructor(el) {
        this.el = el;
        this.chars = '!<>-_\\/[]{}—=+*^?#_';
        this.update = this.update.bind(this);
    }
    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise((resolve) => this.resolve = resolve);
        this.queue = [];
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * 20);  // Reduced from 40
            const end = start + Math.floor(Math.random() * 20);  // Reduced from 40
            this.queue.push({ from, to, start, end });
        }
        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }
    update() {
        let output = '';
        let complete = 0;
        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];
            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.chars[Math.floor(Math.random() * this.chars.length)];
                    this.queue[i].char = char;
                }
                output += `<span class="dud">${char}</span>`;
            } else {
                output += from;
            }
        }
        this.el.innerHTML = output;
        if (complete === this.queue.length) {
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }
}

const phrases = [
    'IT Operational Analyst',
    'Hobbyist Developer',
    'I like dogs'
];

const subtitle = document.querySelector('.subtitle');
const fx = new TextScramble(subtitle);

let counter = 0;
const next = () => {
    fx.setText(phrases[counter]).then(() => {
        setTimeout(next, 1500);  // Reduced from 2000
    });
    counter = (counter + 1) % phrases.length;
};

setTimeout(next, 800);  // Reduced from 1000

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const debouncedResize = debounce(() => {
    resizeCanvas();
}, 250);

window.removeEventListener('resize', resizeCanvas);
window.addEventListener('resize', debouncedResize);

function initShader() {
    try {
        const contextAttributes = {
            alpha: false,
            antialias: false, // Disable antialiasing for better performance
            depth: false,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance'
        };

        const gl = canvasEl.getContext("webgl", contextAttributes) ||
                  canvasEl.getContext("experimental-webgl", contextAttributes);

        const vsSource = document.getElementById("vertShader").innerHTML;
        const fsSource = document.getElementById("fragShader").innerHTML;

        if (!gl) {
            alert("WebGL is not supported by your browser.");
        }

        function createShader(gl, sourceCode, type) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, sourceCode);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        }

        const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
        const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);

        function createShaderProgram(gl, vertexShader, fragmentShader) {
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error("Unable to initialize the shader program: " + gl.getProgramInfoLog(program));
                return null;
            }

            return program;
        }

        const shaderProgram = createShaderProgram(gl, vertexShader, fragmentShader);
        uniforms = getUniforms(shaderProgram);

        function getUniforms(program) {
            let uniforms = [];
            let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
            for (let i = 0; i < uniformCount; i++) {
                let uniformName = gl.getActiveUniform(program, i).name;
                uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
            }
            return uniforms;
        }

        const vertices = new Float32Array([-1., -1., 1., -1., -1., 1., 1., 1.]);

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        gl.useProgram(shaderProgram);

        const positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
        gl.enableVertexAttribArray(positionLocation);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DITHER);
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.disable(gl.SAMPLE_COVERAGE);
        gl.disable(gl.SCISSOR_TEST);
        gl.disable(gl.STENCIL_TEST);

        return gl;
    } catch (error) {
        console.error('WebGL initialization failed:', error);
        fallbackToSimpleBackground();
    }
}

function fallbackToSimpleBackground() {
    const canvas = document.querySelector('canvas#neuro');
    if (canvas) {
        canvas.style.display = 'none';
        document.body.style.background = 'linear-gradient(to bottom, #1a1f2d, #151920)';
    }
}

function render() {
    if (!performanceOptions.isVisible) return;

    const currentTime = performance.now();

    pointer.x += (pointer.tX - pointer.x) * 0.3;
    pointer.y += (pointer.tY - pointer.y) * 0.3;

    gl.uniform1f(uniforms.u_time, currentTime * 0.5); // Slow down the animation
    gl.uniform2f(uniforms.u_pointer_position,
        pointer.x / window.innerWidth,
        1 - pointer.y / window.innerHeight
    );
    gl.uniform1f(uniforms.u_scroll_progress,
        window.pageYOffset / (2 * window.innerHeight)
    );

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    performanceOptions.animationFrame = requestAnimationFrame(render);
}

document.addEventListener('visibilitychange', () => {
    performanceOptions.isVisible = !document.hidden;
    if (performanceOptions.isVisible) {
        performanceOptions.animationFrame = requestAnimationFrame(render);
    } else {
        cancelAnimationFrame(performanceOptions.animationFrame);
    }
});

window.addEventListener('beforeunload', () => {
    if (performanceOptions.animationFrame) {
        cancelAnimationFrame(performanceOptions.animationFrame);
    }
    observer.disconnect();
});

function resizeCanvas() {
    canvasEl.width = window.innerWidth * devicePixelRatio;
    canvasEl.height = window.innerHeight * devicePixelRatio;
    gl.uniform1f(uniforms.u_ratio, canvasEl.width / canvasEl.height);
    gl.viewport(0, 0, canvasEl.width, canvasEl.height);
}

function setupEvents() {
    window.addEventListener("pointermove", e => {
        updateMousePosition(e.clientX, e.clientY);
    });
    window.addEventListener("touchmove", e => {
        updateMousePosition(e.targetTouches[0].clientX, e.targetTouches[0].clientY);
    });
    window.addEventListener("click", e => {
        updateMousePosition(e.clientX, e.clientY);
    });

    function updateMousePosition(eX, eY) {
        pointer.tX = eX;
        pointer.tY = eY;
    }
}

function setupSmoothScroll() {
    document.querySelectorAll('.nav-links a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            const navHeight = document.querySelector('.navbar').offsetHeight;
            const targetPosition = targetSection.getBoundingClientRect().top + window.pageYOffset - navHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });

            document.querySelectorAll('.nav-links a').forEach(link => link.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function updateActiveNavOnScroll() {
    const sections = document.querySelectorAll('section, .hero');
    const navLinks = document.querySelectorAll('.nav-links a');
    const navHeight = document.querySelector('.navbar').offsetHeight;

    window.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY + navHeight + (window.innerHeight * 0.2);
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;

            if (scrollPosition >= sectionTop && scrollPosition < (sectionTop + sectionHeight)) {
                current = section.getAttribute('id') || 'home';
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupSmoothScroll();
    updateActiveNavOnScroll();
});

document.querySelector('.future-card').addEventListener('mousemove', (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    e.target.style.setProperty('--mouse-x', `${x}px`);
    e.target.style.setProperty('--mouse-y', `${y}px`);
});


const mysteryCard = document.querySelector('.mystery-card');
let revealTimeout;
let isRevealing = false;

function handleMysteryCardInteraction(event, isStarting) {
    if (isStarting && !mysteryCard.classList.contains('revealed')) {
        isRevealing = true;
        mysteryCard.classList.add('revealing');
        revealTimeout = setTimeout(() => {
            mysteryCard.classList.add('revealed');
            isRevealing = false;
        }, 2000);
    } else if (!isStarting && isRevealing) {
        clearTimeout(revealTimeout);
        mysteryCard.classList.remove('revealing');
        isRevealing = false;
    }
}

mysteryCard.addEventListener('mousedown', e => handleMysteryCardInteraction(e, true));
mysteryCard.addEventListener('mouseup', e => handleMysteryCardInteraction(e, false));
mysteryCard.addEventListener('mouseleave', e => handleMysteryCardInteraction(e, false));

mysteryCard.addEventListener('touchstart', e => handleMysteryCardInteraction(e, true));
mysteryCard.addEventListener('touchend', e => handleMysteryCardInteraction(e, false));
mysteryCard.addEventListener('touchcancel', e => handleMysteryCardInteraction(e, false));

mysteryCard.addEventListener('selectstart', e => e.preventDefault());


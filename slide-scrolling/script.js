window.addEventListener("load", ()=>{
    console.log("Page loaded");
    const lenis = new Lenis();
    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    const images = [];
    let loadedImageCount = 0;

    function loadImages() {
        console.log("Starting to load images");
        for (let i=1; i<=7; i++) {
            const img = new Image();
            img.onload = function () {
                console.log(`Image ${i} loaded successfully`);
                images.push(img);
                loadedImageCount++;

                if (loadedImageCount === 7) {
                    console.log("All images loaded, initializing scene");
                    initializeScene();
                }
            };

            img.onerror = function () {
                console.error(`Failed to load image ${i} from path: img/img${i}.jpg`);
                loadedImageCount++;

                if (loadedImageCount === 7) {
                    console.log("All image attempts finished, initializing scene");
                    initializeScene();
                }
            };
            img.src = `img/img${i}.jpg`;
        }
    }

    function initializeScene() {
        console.log("Scene initialization started");
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            45, window.innerWidth / window.innerHeight, 0.1, 1000);

        const renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector("canvas"),
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);

        const parentWidth = 20;
        const parentHeight = 75;
        const curvature = 35;
        const segmentsX = 200;
        const segmentsY = 200;

        const parentGeometry = new THREE.PlaneGeometry( 
            parentWidth,
            parentHeight,
            segmentsX,
            segmentsY
        );

        const positions = parentGeometry.attributes.position.array;
        for (let i=0; i<positions.length; i+=3) {
            const y = positions[i+1];
            const distanceFromCenter = Math.abs(y/(parentHeight/2));
            positions[i+2] = Math.pow(distanceFromCenter, 2)* curvature;
        }
        parentGeometry.computeVertexNormals();

        const totalSlides = 7;
        const slideHeight = 15;
        const gap = 0.5;
        const cycleHeight = totalSlides * (slideHeight + gap);

        const textureCanvas = document.createElement("canvas");
        const ctx = textureCanvas.getContext("2d", {
            alpha: false,
            willReadFrequently: false,
        });
        textureCanvas.width = 2048;
        textureCanvas.height = 8192;

        const texture = new THREE.CanvasTexture(textureCanvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

        const parentMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
        });

        const parentMesh = new THREE.Mesh(parentGeometry, parentMaterial);
        parentMesh.position.set(0, 0, 0);
        parentMesh.rotation.x = THREE.MathUtils.degToRad(-20);
        parentMesh.rotation.y = THREE.MathUtils.degToRad(20);

        // Add mesh to scene
        scene.add(parentMesh);

        const distance = 17.5;
        const height  = 5;
        const offsetX = distance * Math.sin(THREE.MathUtils.degToRad(20));
        const offsetZ = distance * Math.cos(THREE.MathUtils.degToRad(20));

        camera.position.set(offsetX, height, offsetZ);
        camera.lookAt(0, -2, 0);
        camera.rotation.z = THREE.MathUtils.degToRad(-5);

        const slideTitles = [
            "Slide 1",
            "Slide 2",
            "Slide 3",
            "Slide 4",
            "Slide 5",
            "Slide 6",
            "Slide 7"
        ];

        function updateTexture(offset = 0) {
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

            const fontSize = 180;
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const extraSlides = 2;

            for(let i = -extraSlides; i< totalSlides + extraSlides; i++) {
                let slideY = -i * (slideHeight + gap);
                slideY += offset* cycleHeight;

                const textureY = (slideY / cycleHeight)*textureCanvas.height;
                let wrappedY = textureY % textureCanvas.height;
                if (wrappedY < 0) wrappedY += textureCanvas.height;

                let slideIndex = ((-i % totalSlides) + totalSlides) % totalSlides;
                let slideNumber = slideIndex + 1;

                const slideRect = {
                    x: textureCanvas.width * 0.05,
                    y: wrappedY,
                    width : textureCanvas.width * 0.9,
                    height: (slideHeight / cycleHeight) * textureCanvas.height,
                };

                const img = images[slideNumber - 1];
                if(img) {
                    const imgAspect = img.width / img.height;
                    const rectAspect = slideRect.width / slideRect.height;

                    let drawWidth, drawHeight, drawX, drawY;

                    if (imgAspect > rectAspect) {
                        drawHeight = slideRect.height;
                        drawWidth = drawHeight * imgAspect;
                        drawX = slideRect.x + (slideRect.width - drawWidth) / 2;
                        drawY = slideRect.y;
                    } else {
                        drawWidth = slideRect.width;
                        drawHeight = drawWidth / imgAspect;
                        drawX = slideRect.x;
                        drawY = slideRect.y + (slideRect.height - drawHeight) / 2;
                    }

                    ctx.save();
                    ctx.beginPath();
                    ctx.roundRect(
                        slideRect.x,
                        slideRect.y,
                        slideRect.width,
                        slideRect.height
                    );
                    ctx.clip();
                    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                    ctx.restore();

                    ctx.fillStyle = "#fff";
                    ctx.fillText(
                        slideTitles[slideIndex],
                        textureCanvas.width / 2,
                        wrappedY + slideRect.height / 2
                    );
                }
            }
            texture.needsUpdate = true;
        }

        // Initial render
        updateTexture(0);
        renderer.render(scene, camera);
        console.log("Initial render complete");
        let currentScroll = 0;
        lenis.on("scroll", ({scroll, limit, velocity, direction, progress}) => {
            currentScroll = scroll / limit;
            updateTexture(-currentScroll);
            renderer.render(scene, camera);
        });

        let resizeTimeout;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.render(scene, camera);
            }, 100);
        });
    }

    loadImages();
});
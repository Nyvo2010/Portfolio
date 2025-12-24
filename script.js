document.addEventListener('DOMContentLoaded', () => {
    const cursorDot = document.querySelector('[data-cursor-dot]');
    const cursorOutline = document.querySelector('[data-cursor-outline]');

    if (cursorDot && cursorOutline) {
        let outlineScale = 1;

        const setOutlineScale = (scale) => {
            const baseSize = 30;
            const newSize = baseSize * scale;
            cursorOutline.style.width = `${newSize}px`;
            cursorOutline.style.height = `${newSize}px`;
        };

        window.addEventListener('mousemove', function (e) {
            const posX = e.clientX;
            const posY = e.clientY;

            if (!document.body.classList.contains('cursor-visible')) {
                document.body.classList.add('cursor-visible');
            }

            const transformPos = `translate3d(${posX}px, ${posY}px, 0) translate(-50%, -50%)`;
            cursorDot.style.transform = transformPos;
            cursorOutline.style.transform = transformPos;
        });

        const hoverSelector = 'a, button, [role="button"], .text-reveal-link, .work-button, .work-button-placeholder, .contact-button-large, .contact-buttons-small > div, #top-header span';

        document.addEventListener('mouseover', (e) => {
            const hit = e.target.closest ? e.target.closest(hoverSelector) : null;
            if (hit) setOutlineScale(1.8);
        });
        document.addEventListener('mouseout', (e) => {
            const hit = e.target.closest ? e.target.closest(hoverSelector) : null;
            if (hit) setOutlineScale(1);
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const header = document.getElementById('top-header');
    if (!header) return;
    const burger = header.querySelector('.hamburger');
    const nav = header.querySelector('nav');
    if (!burger || !nav) return;

    const toggleNav = (open) => {
        const isOpen = typeof open === 'boolean' ? open : !header.classList.contains('nav-open');
        if (isOpen) {
            header.classList.add('nav-open');
            document.body.classList.add('nav-open');
        } else {
            header.classList.remove('nav-open');
            document.body.classList.remove('nav-open');
        }
        burger.classList.toggle('open', isOpen);
        burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        burger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    };

    burger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleNav();
    });

    document.addEventListener('click', (e) => {
        if (!header.contains(e.target)) {
            header.classList.remove('nav-open');
            document.body.classList.remove('nav-open');
            burger.classList.remove('open');
            burger.setAttribute('aria-expanded', 'false');
            burger.setAttribute('aria-label', 'Open menu');
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            header.classList.remove('nav-open');
            document.body.classList.remove('nav-open');
            burger.classList.remove('open');
            burger.setAttribute('aria-expanded', 'false');
            burger.setAttribute('aria-label', 'Open menu');
        }
    });
});

function createTextReveal({
    topText,
    bottomText,
    fontSize = 'clamp(48px, 15vw, 200px)',
    fontWeight = '400',
    textColor = '#1A1A1A',
    letterSpacing = '-0.02em',
    link = '#',
    fullWidth = false,
    extraBuffer = 2,
}) {
    const fontFamily = 'Satoshi, system-ui, -apple-system, sans-serif';

    const container = document.createElement('div');
    container.className = 'text-reveal-container';
    container.style.position = 'relative';
    container.style.display = 'inline-block';
    container.style.width = 'auto';
    container.style.overflow = 'hidden';
    container.style.opacity = '0';
    container.style.transition = 'opacity 0.2s ease';

    const measurementLayer = document.createElement('div');
    measurementLayer.style.position = 'absolute';
    measurementLayer.style.left = '-9999px';
    measurementLayer.style.top = '-9999px';
    measurementLayer.style.visibility = 'hidden';
    measurementLayer.style.pointerEvents = 'none';

    const topMeasure = document.createElement('div');
    topMeasure.textContent = topText;
    topMeasure.style.fontSize = fontSize;
    topMeasure.style.lineHeight = '0.85';
    topMeasure.style.fontFamily = fontFamily;
    topMeasure.style.fontWeight = fontWeight;
    topMeasure.style.whiteSpace = 'nowrap';
    topMeasure.style.letterSpacing = letterSpacing;
    topMeasure.style.paddingBottom = '0.15em';

    const bottomMeasure = document.createElement('div');
    bottomMeasure.style.fontSize = fontSize;
    bottomMeasure.style.lineHeight = '0.85';
    bottomMeasure.style.fontFamily = fontFamily;
    bottomMeasure.style.fontWeight = fontWeight;
    bottomMeasure.style.whiteSpace = 'nowrap';
    bottomMeasure.style.letterSpacing = '-0.015em';
    bottomMeasure.style.paddingBottom = '0.15em';
    bottomMeasure.style.display = 'flex';
    bottomMeasure.style.alignItems = 'center';

    const bottomTextSpan = document.createElement('span');
    bottomTextSpan.textContent = bottomText + ' →';
    bottomMeasure.appendChild(bottomTextSpan);

    measurementLayer.appendChild(topMeasure);
    measurementLayer.appendChild(bottomMeasure);
    document.body.appendChild(measurementLayer);

    const linkElement = document.createElement('a');
    linkElement.href = link;
    linkElement.className = 'text-reveal-link';
    linkElement.style.fontFamily = fontFamily;
    linkElement.style.fontWeight = fontWeight;
    linkElement.style.color = textColor;
    linkElement.style.textDecoration = 'none';
    linkElement.style.transform = 'translateY(0)';
    linkElement.style.transition = 'transform 0.3s ease';
    linkElement.style.display = 'block';
    linkElement.style.cursor = 'pointer';
    linkElement.style.userSelect = 'none';
    linkElement.style.position = 'relative';

    const topTextDiv = document.createElement('div');
    topTextDiv.textContent = topText;
    topTextDiv.style.fontSize = fontSize;
    topTextDiv.style.lineHeight = '0.85';
    topTextDiv.style.letterSpacing = letterSpacing;
    topTextDiv.style.paddingBottom = '0.15em';

    const bottomTextDiv = document.createElement('div');
    bottomTextDiv.style.position = 'absolute';
    bottomTextDiv.style.left = '0';
    bottomTextDiv.style.top = '100%';
    bottomTextDiv.style.fontSize = fontSize;
    bottomTextDiv.style.lineHeight = '0.85';
    bottomTextDiv.style.letterSpacing = '-0.015em';
    bottomTextDiv.style.whiteSpace = 'nowrap';
    bottomTextDiv.style.paddingBottom = '0.15em';
    bottomTextDiv.style.display = 'flex';
    bottomTextDiv.style.alignItems = 'center';

    if (fullWidth) {
        container.style.display = 'block';
        linkElement.style.width = '100%';
        topTextDiv.style.textAlign = 'left';
        bottomTextDiv.style.justifyContent = 'flex-start';
    }

    const bottomText1 = document.createElement('span');
    bottomText1.textContent = bottomText + ' →';
    bottomTextDiv.appendChild(bottomText1);

    const topTextCopy = document.createElement('div');
    topTextCopy.textContent = topText;
    topTextCopy.style.position = 'absolute';
    topTextCopy.style.left = '0';
    topTextCopy.style.top = '200%';
    topTextCopy.style.fontSize = fontSize;
    topTextCopy.style.lineHeight = '0.85';
    topTextCopy.style.letterSpacing = letterSpacing;
    topTextCopy.style.paddingBottom = '0.15em';

    linkElement.appendChild(topTextDiv);
    linkElement.appendChild(bottomTextDiv);
    linkElement.appendChild(topTextCopy);

    container.appendChild(linkElement);

    container.style.cursor = 'pointer';

    // Animate when hovering the full container (not only the inner link text)
    container.addEventListener('mouseenter', () => {
        linkElement.style.transform = 'translateY(-100%)';
    });

    container.addEventListener('mouseleave', () => {
        linkElement.style.transform = 'translateY(0)';
    });

    // Forward clicks on the container (outside the inner anchor) to the link
    container.addEventListener('click', (e) => {
        if (!e.target.closest || !e.target.closest('a')) {
            window.location.href = linkElement.href;
        }
    });

    const measureWidths = () => {
        topMeasure.offsetHeight;
        bottomMeasure.offsetHeight;

        const topWidth = topMeasure.offsetWidth;
        const bottomWidth = bottomMeasure.offsetWidth;
        const measuredWidth = Math.max(topWidth, bottomWidth);

        if (fullWidth) {
            container.style.display = 'block';

            let ancestor = container.parentElement;
            let availableWidth = ancestor ? ancestor.getBoundingClientRect().width : document.documentElement.clientWidth;
            while (availableWidth === 0 && ancestor && ancestor.parentElement) {
                ancestor = ancestor.parentElement;
                availableWidth = ancestor.getBoundingClientRect().width;
            }

            const targetWidth = Math.max(availableWidth - extraBuffer, 10);

            const currentFontPx = parseFloat(window.getComputedStyle(topMeasure).fontSize) || 16;

            const scale = targetWidth / Math.max(measuredWidth, 1);
            let newFontPx = currentFontPx * scale;

            newFontPx = Math.max(10, Math.min(newFontPx, 600));

            [topMeasure, bottomMeasure, topTextDiv, bottomTextDiv, topTextCopy].forEach(el => {
                el.style.fontSize = `${newFontPx}px`;
            });

            topMeasure.offsetHeight; bottomMeasure.offsetHeight;
            const newMeasured = Math.max(topMeasure.offsetWidth, bottomMeasure.offsetWidth);
            if (newMeasured > targetWidth && newMeasured > 0) {
                const reduction = targetWidth / newMeasured;
                const finalFontPx = Math.max(10, Math.floor(newFontPx * reduction));
                [topMeasure, bottomMeasure, topTextDiv, bottomTextDiv, topTextCopy].forEach(el => {
                    el.style.fontSize = `${finalFontPx}px`;
                });
            }

            container.style.width = '100%';
        } else {
            container.style.width = `${measuredWidth + extraBuffer}px`;
        }

        container.style.opacity = '1';
    };

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            measureWidths();
            setTimeout(measureWidths, 50);
            setTimeout(measureWidths, 150);
            setTimeout(measureWidths, 300);
            setTimeout(measureWidths, 500);
        });
    } else {
        setTimeout(measureWidths, 100);
        setTimeout(measureWidths, 300);
        setTimeout(measureWidths, 500);
    }

    window.addEventListener('resize', measureWidths);

    return container;
}

document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('#top-header span');
    if (!logo) return;
    logo.style.cursor = 'pointer';
    logo.addEventListener('click', (e) => {
        window.location.href = 'index.html';
    });
});

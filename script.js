document.addEventListener('DOMContentLoaded', () => {
    const preloader = document.querySelector('.preloader');
    
    prepareAnimations();

    if (preloader) {
        document.body.classList.add('loading');
        
        window.addEventListener('load', () => {
            setTimeout(() => {
                preloader.classList.add('hidden');
                document.body.classList.remove('loading');
                setTimeout(startObservers, 100);
            }, 1000);
        });
    } else {
        startObservers();
    }

    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    const cursorDot = document.querySelector('[data-cursor-dot]');
    const cursorOutline = document.querySelector('[data-cursor-outline]');
    
    if (cursorDot && cursorOutline) {
        window.addEventListener('mousemove', function (e) {
            const posX = e.clientX;
            const posY = e.clientY;

            if (!document.body.classList.contains('cursor-visible')) {
                document.body.classList.add('cursor-visible');
            }

            document.body.style.setProperty('--mouse-x', `${posX}px`);
            document.body.style.setProperty('--mouse-y', `${posY}px`);

            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;

            cursorOutline.animate({
                left: `${posX}px`,
                top: `${posY}px`
            }, { duration: 180, fill: "forwards" });
        });

        const interactiveElements = document.querySelectorAll('a, button, .work-item, .scroll-indicator');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
            el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
        });
    }

    document.body.setAttribute('data-theme', 'dark');


    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        let ticking = false;
        function updateIndicator() {
            if (window.scrollY > 10) {
                scrollIndicator.classList.add('hidden');
                scrollIndicator.setAttribute('aria-hidden', 'true');
            } else {
                scrollIndicator.classList.remove('hidden');
                scrollIndicator.setAttribute('aria-hidden', 'false');
            }
            ticking = false;
        }
        function onScroll() {
            if (!ticking) {
                window.requestAnimationFrame(updateIndicator);
                ticking = true;
            }
        }
        updateIndicator();
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    function prepareAnimations() {
        const splitTargets = document.querySelectorAll('.hero-line, .quote-sentence, .about-text span, .heading-line, .work-item-text, .contact-item .work-item-text');
        
        splitTargets.forEach(target => {
            if (target.classList.contains('split-done') || !target.textContent.trim()) return;

            const originalContent = target.innerHTML;
            target.innerHTML = '';
            target.classList.add('split-done');
            
            const wrapWords = (text) => {
                const hasLeadingSpace = text.startsWith(' ') || text.startsWith('\n') || text.startsWith('\t');
                const hasTrailingSpace = text.endsWith(' ') || text.endsWith('\n') || text.endsWith('\t');
                const words = text.trim().split(/\s+/);
                
                let result = words.map((word, index) => {
                    const suffix = index < words.length - 1 ? '&nbsp;' : '';
                    return `<span class="word">${word}${suffix}</span>`;
                }).join('');
                
                if (hasLeadingSpace) result = '&nbsp;' + result;
                if (hasTrailingSpace) result = result + '&nbsp;';
                
                return result;
            };

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = originalContent;

            Array.from(tempDiv.childNodes).forEach(node => {
                if (node.nodeType === 3) {
                    const text = node.textContent;
                    if (text.trim()) {
                        const span = document.createElement('span');
                        span.innerHTML = wrapWords(text);
                        while (span.firstChild) {
                            target.appendChild(span.firstChild);
                        }
                    }
                } else if (node.nodeType === 1) {
                    const clone = node.cloneNode(true);
                    const wrapper = document.createElement('span');
                    wrapper.classList.add('word', 'icon-word');
                    wrapper.appendChild(clone);
                    target.appendChild(wrapper);
                    
                    target.appendChild(document.createTextNode(' ')); 
                }
            });
        });
    }

    function startObservers() {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const words = entry.target.querySelectorAll('.word');
                    words.forEach((word, index) => {
                        setTimeout(() => {
                            word.classList.add('visible');
                        }, index * 20);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        const splitTargets = document.querySelectorAll('.hero-line, .quote-sentence, .about-text span, .heading-line, .work-item-text, .contact-item .work-item-text');
        splitTargets.forEach(el => {
            observer.observe(el);
        });
        
        const workItems = document.querySelectorAll('.work-item');
        const workObserver = new IntersectionObserver((entries) => {
             entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    workObserver.unobserve(entry.target);
                }
             });
        }, { threshold: 0.1 });

        workItems.forEach(item => {
            item.classList.add('fade-animate');
            workObserver.observe(item);
        });
    }
});

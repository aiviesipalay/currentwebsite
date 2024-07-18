/* JS for preset "Menu V2" */
(function() {
	$(function() {
		$('.menu-wrapper').each(function() {
			initMenu($(this))
		});
	});

	// Make :active pseudo classes work on iOS
	document.addEventListener("touchstart", function() {}, false);

	var initMenu = function($menuWrapper) {
		var $body = $('body');
		var $menu = $('.ed-menu', $menuWrapper);
		var $menuLinks = $('a', $menu);
		var $menuTrigger = $('.menu-trigger', $menuWrapper);
		var $banner = $('.banner').first();

		var menuWrapperHeight = $menuWrapper.outerHeight();
		var bannerHeight = $banner.length ? $banner.outerHeight() : 0;
		var smoothScrollOffset = 20;
		
		toggleClassOnClick($body.add($menu), $menuTrigger, null, 'open open-menu'); // Keep open on $menu for backward compatibility
		activateSmoothScroll($menuLinks.add($('.scroll a')), smoothScrollOffset);
		addClassOnVisibleLinkTargets($menuLinks, 'active', 2 / 3);
		handleSticky($menuWrapper, 'sticky', $banner);
	};

	/**
	 * Observe element's height changes and reload the initMenu() function
	 *
	 * @param {HTMLElement} elm Element to observe
	 * @param {function} callback to call when elmement's height changed
	 */
	var observeHeightChange = function(elm, callback) {
		if (!('ResizeObserver' in window) || elm == null) return;

		var ro = new ResizeObserver(callback);
		ro.observe(elm);
	}

	/**
	 * Toggles class on a target when a trigger is clicked
	 * 
	 * @param {jQuery} $target The target to apply the CSS class to
	 * @param {jQuery} $trigger The Trigger
	 * @param {jQuery} $closeTrigger Optional close trigger
	 * @param {string} cssClass CSS Class to toggle on the target
	 */
	var toggleClassOnClick = function($target, $trigger, $closeTrigger, cssClass) {

		// Reset in case class "open" was saved accidentally
		$target.removeClass(cssClass);
		$trigger.removeClass(cssClass);

		// Click on trigger toggles class "open"
		$trigger.off('.toggle').on('click.toggle', function() {
			$(this).toggleClass(cssClass);
			$target.toggleClass(cssClass);
		});

		// Close target when link inside is clicked
		$target.find('a').click(function() {
			$target.removeClass(cssClass);
			$trigger.removeClass(cssClass);
		});

		if (!$closeTrigger || !$closeTrigger.length) {
			return;
		}

		$closeTrigger.click(function() {
			$target.removeClass(cssClass);
			$trigger.removeClass(cssClass);
		});
	};

	/**
	 * Smooth scroll to link targets
	 * 
	 * @param {jQuery} $scrollLinks The links
	 * @param {jQuery} scrollOffset Offset to subtract from the scroll target position (e.g. for fixed positioned elements like a menu)
	 */
	var activateSmoothScroll = function($scrollLinks, scrollOffset) {
		if (typeof scrollOffset === 'undefined') {
			scrollOffset = 0;
		}

		var determineTarget = function($trigger, hash) {
			if (hash == '#!next') {
				return $trigger.closest('.ed-element').next();
			}

			return $(hash);
		}

		$scrollLinks.click(function(e) {
			var $target = determineTarget($(this), this.hash);
			if (!$target.length) return;
			e.preventDefault();

			viewport.scrollTo($target, 'top', 500, 0);

		});
	};

	/**
	 * We are using the fill property on an element to pass user's choices from CSS to JavaScript
	 * 
	 * @param {jQuery} $element
	 */
	var getStickyMode = function($element) {
		var fillValue = getComputedStyle($element[0]).fill;

		return fillValue === 'rgb(255, 0, 0)' ?
			'sticky_banner' :
			fillValue === 'rgb(0, 255, 0)' ?
			'sticky_menu' :
			fillValue === 'rgb(0, 0, 255)' ?
			'sticky_instant' :
			fillValue === 'rgb(255, 255, 255)' ?
			'sticky_reverse' :
			'sticky_none';
	};

	/**
	 * Adds a class to an element when not currently visible
	 * 
	 * @param {jQuery} $element The element to handle stickyness for
	 * @param {string} cssClass The actual CSS class to be applied to the element when it's above a certain scroll position
	 * @param {jQuery} $banner A banner to reference the scroll position to
	 */
	var handleSticky = function($element, cssClass, $banner) {
		var triggerPos = 0,
			offset = 0;
		var menuWrapperHeight = $element.outerHeight();
		var mode;
		var prevScroll = 0;
		$element.removeClass(cssClass);
		
		var toggleSpacer = function(toggle) {
			document.body.style.setProperty('--spacer-height', toggle ? menuWrapperHeight + 'px' : '');
		};

		var handleScroll = function() {
			if (!$element.length || mode === 'sticky_none') return;

			var isReverse = mode === 'sticky_reverse',
				curScroll = viewport.getScrollTop();

			if (triggerPos <= curScroll && (!isReverse || prevScroll > curScroll)) {
				$element.addClass(cssClass);
				toggleSpacer(true);
			} else {
				$element.removeClass(cssClass);
				toggleSpacer(false);
			}

			prevScroll = curScroll;
		};
		
		var updateOffset = function() {
			mode = getStickyMode($element);
			menuWrapperHeight = $element.outerHeight();
			if (!$element.hasClass(cssClass)) {
				offset = $element.offset().top;
			}
			if (mode === 'sticky_banner' && !$banner.length) {
				mode = 'sticky_menu';
			}
			if (mode === 'sticky_banner') {
				triggerPos = $banner.offset().top + ($banner.length ? $banner.outerHeight() : $element.outerHeight());
			}
			if (mode === 'sticky_menu' || mode === 'sticky_reverse') {
				triggerPos = offset + $element.outerHeight();
			}
			if (mode === 'sticky_instant') {
				triggerPos = offset;
			}
			
			handleScroll();
		}
		
		viewport.observe('resize', updateOffset);
		viewport.observe('animation.end', updateOffset);
		observeHeightChange($element[0], updateOffset);
		updateOffset();
		
		viewport.observe('scroll', handleScroll);
		handleScroll();
	};

	/**
	 * Adds a class to links whose target is currently inside the viewport
	 * 
	 * @param {jQuery} $links Link(s) to be observed
	 * @param {string} cssClass CSS Class to be applied
	 * @param {float} sectionViewportRatio Ratio by which the target should be within the viewport
	 */
	var addClassOnVisibleLinkTargets = function($links, cssClass, sectionViewportRatio) {
		if (typeof sectionViewportRatio === 'undefined') {
			sectionViewportRatio = 1 / 2;
		}

		var menuTargets = [];
		var activeLink = $links.filter('.active:not(.wv-link-elm)').eq(0);

		var links = $links.filter(function() {
			var $target = $(this.hash);
			if (!$target.length) {
				return false;
			}

			// Cache offset position to improve performance (update on resize)		
			var updateOffset = function() {
				$target.data('offset', $target.offset().top);
			};

			viewport.observe('resize', updateOffset);
			viewport.observe('animation.end', updateOffset);
			updateOffset();

			menuTargets.push($target);
			return true;
		});

		// No hash links found, so don't handle it at all
		if (!links.length) {
			return;
		}

		var checkVisibility = function() {
			$links.removeClass('active');

			// Check section position reversely
			for (var i = menuTargets.length - 1; i >= 0; i--) {
				var desiredScrollPosition = menuTargets[i].data('offset') - viewport.getHeight() * (1 - sectionViewportRatio);
				if (viewport.getScrollTop() >= desiredScrollPosition && menuTargets[i][0].offsetParent !== null) {
					links.eq(i).addClass(cssClass);
					return;
				}
			}

			// Fallback to originally active item
			activeLink.addClass(cssClass);
		};

		viewport.observe('scroll', checkVisibility);
		checkVisibility();
	};
})();
/* End JS for preset "Menu V2" */

/* JS for preset "Collection Search" */
(function() {
    function debounce(func, wait, immediate) {
    	var timeout;
    	return function() {
    		var context = this,
    			args = arguments;
    		var later = function() {
    			timeout = null;
    			if (!immediate) func.apply(context, args);
    		};
    		var callNow = immediate && !timeout;
    		clearTimeout(timeout);
    		timeout = setTimeout(later, wait);
    		if (callNow) func.apply(context, args);
    	};
    }
    document.addEventListener('DOMContentLoaded', () => {
    	var search = document.getElementById('collection-search');
    	var clear = document.getElementById('collection-search-clear');
    	if (!search || !clear) {
    	    return;
    	}
    	
    	var runSearch = function() {
    		window.location.hash = search.value ? '#!search=' + encodeURI(search.value) : '#!';
    	};
    	
    	var debouncedFunc = debounce(runSearch, 400);
    	
    	
		search.addEventListener('keyup', function(event) {
			if (event.keyCode == 13) {
				runSearch();
			} else {
				debouncedFunc();
			}
		});
		clear.addEventListener('click', function(event) {
			search.value = '';
		});
    });
})();
/* End JS for preset "Collection Search" */

/* JS for preset "Typewriter" */
$(function() {
	$('.tw-instance').each(function() {
		typeWriter($(this))
	});
});

const typeWriter = function($twInstance) {
	const $target = $twInstance;
	const $tw_output = $('.tw-output', $target);
	let index = 0,
		isAdding = true
	let text = [];
	let current = 0;
	let animationLoop = 0;
	let writing_speed,
		deleting_speed,
		cursor_ticking,
		pause,
		pause_hover,
		loop,
		trigger,
		isHovering;

	// Wait for load
	const ready = function(callback) {
		var fn = function() {
			callback();
		};

		if (window.readyState !== 'loading') {
			fn();
			return;
		}
		document.addEventListener('DOMContentLoaded', fn);
	};

	// Save the texts
	$('.text-container .ed-element.ed-text', $target).text(function(index, currentcontent) {
		text[index] = currentcontent;
	});

	const typeWriterAnim = function() {
		const timeoutId = setTimeout(() => {
			if (String(timeoutId) !== $twInstance[0].dataset.timeoutId) return;
		
			if (isHovering && pause_hover) {
			    typeWriterAnim();
			    return;
			}
			
			//Stop animation when editing
			if ($('.text-container .ed-element.ed-text', $target).hasClass('wv-editing')) {
			    typeWriterAnim();
			    return;
			}
			
			if (text[current] !== undefined) {
				$tw_output[0].innerHTML = text[current].substring(0, index);
			}

			if (isAdding) {
				// adding text
				if ($tw_output[0].innerHTML.length == 0) {
					$tw_output.addClass("showAnim");
					$tw_output.removeClass("hideCursor");
					setTimeout(() => {
						index++;
					}, pause);
				} else {
					if (index > text[current].length) {
						// no more text to add
						isAdding = false;

						// pause before starting deletion
						$tw_output.addClass("showAnim");
						setTimeout(function() {
							typeWriterAnim();
						}, pause);
						return;
					} else {
						// increment index by 1
						index++;
						$tw_output.removeClass("showAnim");
					}
				}
			} else {
				// removing text
				if (index === 0) {
					// blink again
					$tw_output.addClass("showAnim");
					// no more text to remove
					isAdding = true;

					//Re-parsing settings (edit mode only)
					if (document.body.classList.contains('edit')) {
						handleSettingValues();
						reParseTexts();
					}

					// handle loop
					if (loop) {
						current = (current + 1) % text.length;
					} else {
						current = (current + 1);
						// keep looping on edit mode (just for show)
						if (document.body.classList.contains('edit') && current === text.length) {
							current = 0;
						}
					}
				} else {
					//keep last text visible (not on edit mode)
					if (!document.body.classList.contains('edit')) {
						if (loop === false && current === text.length - 1) {
							$tw_output.removeClass("showAnim");
							$tw_output.addClass("hideCursor");
							return;
						}
					}
					// decrement index by 1
					index--;
					$tw_output.removeClass("showAnim");
				}
			}
			typeWriterAnim();
		}, isAdding ? writing_speed : deleting_speed);
		$twInstance[0].dataset.timeoutId = timeoutId;
	}

	// Parse and handle the values from preset
	const handleSettingValues = function() {
		const values = window.getComputedStyle($target[0], ':before').content.slice(1, -1).split('-');
		let ms_pattern = /[ms]\D/;
		let parsedValues = [];

		values.forEach(value => {
			if (value === 'false' || value === "true") {
				parsedValues.push(JSON.parse(value));
			} else if (ms_pattern.test(value)) {
				parsedValues.push(parseFloat(value.replace('ms', '')))
			} else {
				parsedValues.push(parseFloat(value.replace('s', '')) * 1000)
			}
		});

		writing_speed = parsedValues[0];
		deleting_speed = parsedValues[1];
		cursor_ticking = parsedValues[2];
		pause = parsedValues[3];
		pause_hover = parsedValues[4];
		loop = parsedValues[5];

		// Handle mouse hover
		if (pause_hover) {
			$tw_output[0].addEventListener(('mouseenter'), function() {
				isHovering = true;
			});
			$tw_output[0].addEventListener(('mouseleave'), function() {
				isHovering = false;
			});

			// Necessary for "pause on hover" (on edit mode)
			$tw_output.addClass("pauseHover");
		} else {
			$tw_output.removeClass("pauseHover");
		}

	}

	const reParseTexts = function() {
		// Refresh text
		text = [];

		$('.text-container .ed-element.ed-text', $target).each(function(index, currentcontent) {
			text[index] = $(currentcontent).text();
		});
	}

	handleSettingValues();

	/**
	 * Get the trigger value
	 * We are using the fill property on an element to pass user's choices from CSS to JavaScript
	 * 
	 * @param {jQuery} $element
	 */
	const getTrigger = function($element) {
		let triggerValue = getComputedStyle($element[0]).fill;

		return triggerValue === 'rgb(0, 255, 0)' ?
			'scroll' :
			'load';
	};

	//Play animation on "scroll into element"
	const animationObserver = new IntersectionObserver((entries, observer) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				animationLoop += 1;
				if (animationLoop <= 1) {
					typeWriterAnim();
				}
			}
		})
	}, {
		root: document.window,
		rootMargin: "0px",
	});

	//Start animation 
	ready(function() {

		//Initialize values if needed
		writing_speed = isNaN(writing_speed) ? 200 : writing_speed
		deleting_speed = isNaN(deleting_speed) ? 100 : deleting_speed
		cursor_ticking = isNaN(cursor_ticking) ? 200 : cursor_ticking
		pause = isNaN(pause) ? 500 : pause
		pause_hover === undefined ? pause_hover = false : pause_hover;
		loop === undefined ? loop = true : loop;

		trigger = getTrigger($tw_output);

		if (trigger === 'scroll') {
			if (!document.body.classList.contains('edit')) {
				animationObserver.observe($tw_output[0]);
			} else {
				typeWriterAnim();
			}
		}
		if (trigger === 'load') {
			typeWriterAnim();
		}
	});
};
/* End JS for preset "Typewriter" */

/* JS for preset "Image Comparison" */
$(function() {
    var imageComparisonSliders = document.querySelectorAll('.image-comparison-container');
    imageComparisonSliders.forEach(function(slider) {
        var range = slider.querySelector('.range-slider input');
        var beforeContainer = slider.querySelector('.image-before-container');
        if (!range || !beforeContainer) {
            return;
        }
        var positionSlider = function(width) {
            beforeContainer.style.width = width + "%";
            beforeContainer.querySelector('.background').style.width = (100/width*100) + "%";
        };
        range.addEventListener('input', function(e) { positionSlider(e.target.value); });
        positionSlider(50);
    });
});
/* End JS for preset "Image Comparison" */
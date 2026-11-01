# UI Component Design Specification & Reverse-Engineering Prompt

> Extracted via PageSnap from: https://dogstudio.co/
> Target: `<main>` (1512px × 3808px)

---

## 1. Visual & Layout Overview
- **HTML Element:** `<main>`
- **Dimensions:** `1512px` width × `3808px` height
- **Display & Layout:** `block`
- **Flex/Grid Alignment:** Align: `normal`, Justify: `normal`, Gap: `normal`
- **Box Shadow:** `none`
- **Border Radius:** `0px`
- **Backdrop Filter:** `none`

---

## 2. Design Tokens
### Color Palette:
- `rgb(255, 255, 255)`
- `rgb(228, 51, 51)`
- `rgba(160, 168, 220, 0.7)`
- `rgb(100, 109, 158)`
- `rgba(187, 194, 229, 0.3)`
- `rgba(255, 255, 255, 0.996)`
- `rgb(0, 0, 238)`
- `rgb(215, 154, 33)`
- `rgb(95, 196, 170)`
- `rgb(88, 165, 196)`
- `rgb(255, 46, 191)`
- `rgb(255, 102, 160)`
- `rgb(91, 178, 122)`
- `rgb(133, 117, 81)`
- `rgba(187, 194, 229, 0.4)`

### Typography:
- Font Family: `Heebo, Helvetica, Arial, sans-serif`
- Font Family: `"GT Sectra Display", Times, Georgia, serif`
- Font Family: `Gilroy, Helvetica, Arial, sans-serif`
- Font Size: `14px`
- Font Weight: `400`
- Line Height: `29.4px`

---

## 3. Motion & Animation Specs
- **CSS Transition:** `all`
- **CSS Animation:** `none`
- **Active Transform:** `none`

### Keyframe Animations:
```css
@-webkit-keyframes ud40f256c { 
  0% { opacity: 0; transform: translateY(50px); }
  100% { opacity: 1; transform: translateY(0px); }
}

@-webkit-keyframes ub8d47c1d { 
  0% { opacity: 0; transform: translate(-50%, -50%) scale(1.1); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@-webkit-keyframes u2e54375a { 
  0% { opacity: 1; transform: translateY(0px); }
  100% { opacity: 0; transform: translateY(-50px); }
}

@-webkit-keyframes uecdad3ae { 
  0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
}
```


### JavaScript-driven motion (observed)
- **Interactive Driver:** `time-loop` (Autonomous Time-Loop: runs on its own, not tied to the pointer. The exported HTML shows the first frame only; rebuild the timeline from the states and cadence listed below)
- `class`: 9135 writes on 25 element(s) over ~274860 ms, about one batch every 9 ms
- `style`: 418 writes on 1 element(s) over ~262358 ms, about one batch every 8 ms
- `transform`: 109 writes on 11 element(s) over ~222066 ms

### Dual-State Comparison (State 1: Resting vs State 2: Peak Hover)
Auto-sweep probing captured the maximum range of motion between resting state and peak hover state across 6 animated elements:
1. `main > section:nth-of-type(2) > div:nth-of-type(2)` (`.ps-el-88`, `class`)
   - State 1 (Resting): `home-cases-scenes`
   - State 2 (Peak Hover): `home-cases-scenes on-top is-sticky`
   - Cadence: ~8654 frames over ~262358 ms (attribute-tween)
2. `main > picture > img` (`.ps-el-6`, `style`)
   - State 1 (Resting): `opacity: 1;`
   - State 2 (Peak Hover): `opacity: 0.0176667;`
   - Cadence: ~418 frames over ~262358 ms (attribute-tween)
3. `main > section:nth-of-type(1) > div > a` (`.ps-el-37`, `transform`)
   - State 1 (Resting): `none`
   - State 2 (Peak Hover): `matrix(1, 0, 0, 1, -51.1602, 0)`
   - Cadence: ~66 frames over ~215123 ms (transform-tween)
4. `main > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3)` (`.ps-el-133`, `class`)
   - State 1 (Resting): `home-cases-scene home-cases-scene--msi-chicago`
   - State 2 (Peak Hover): `home-cases-scene home-cases-scene--msi-chicago is-hidden`
   - Cadence: ~45 frames over ~240409 ms (attribute-tween)
5. `main > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2)` (`.ps-el-111`, `class`)
   - State 1 (Resting): `home-cases-scene home-cases-scene--navy-pier`
   - State 2 (Peak Hover): `home-cases-scene home-cases-scene--navy-pier is-hidden`
   - Cadence: ~44 frames over ~242280 ms (attribute-tween)
6. `main > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(7)` (`.ps-el-219`, `class`)
   - State 1 (Resting): `home-cases-scene home-cases-scene--orw`
   - State 2 (Peak Hover): `home-cases-scene home-cases-scene--orw is-hidden`
   - Cadence: ~42 frames over ~246955 ms (attribute-tween)

### Interactive State Toggles (CSS & Structural Shifts):
1. `main > section:nth-of-type(2) > div:nth-of-type(1) > ul > li:nth-of-type(2) > a > span` (`.ps-el-72`, `transform`)
   - Rest: `none`
   - Active Hover: `matrix(1, 0, 0, 1, -175.883, 0)`
   - Computed Delta: translateY(0px)
2. `main > section:nth-of-type(2) > div:nth-of-type(1) > ul > li:nth-of-type(3) > a > span` (`.ps-el-75`, `transform`)
   - Rest: `none`
   - Active Hover: `matrix(1, 0, 0, 1, -175.68, 0)`
   - Computed Delta: translateY(0px)
3. `main > section:nth-of-type(2) > div:nth-of-type(1) > ul > li:nth-of-type(4) > a > span` (`.ps-el-78`, `transform`)
   - Rest: `none`
   - Active Hover: `matrix(1, 0, 0, 1, -105.109, 0)`
   - Computed Delta: translateY(0px)
4. `main > section:nth-of-type(2) > div:nth-of-type(1) > ul > li:nth-of-type(5) > a > span` (`.ps-el-81`, `transform`)
   - Rest: `none`
   - Active Hover: `matrix(1, 0, 0, 1, -175.508, 0)`
   - Computed Delta: translateY(0px)
5. `main > section:nth-of-type(2) > div:nth-of-type(1) > ul > li:nth-of-type(6) > a > span` (`.ps-el-84`, `transform`)
   - Rest: `none`
   - Active Hover: `matrix(1, 0, 0, 1, -104.477, 0)`
   - Computed Delta: translateY(0px)
6. `main > section:nth-of-type(2) > div:nth-of-type(1) > ul > li:nth-of-type(7) > a > span` (`.ps-el-87`, `transform`)
   - Rest: `none`
   - Active Hover: `matrix(1, 0, 0, 1, -198.82, 0)`
   - Computed Delta: translateY(0px)

Recreate it by animating those attributes between State 1 (Resting) and State 2 (Peak Hover) with Framer Motion or GSAP.



## 3b. Render surfaces (NOT in this export)

Part of this region is drawn outside HTML and CSS. The exported markup and styles show none of it, and none of it can be read from the page's CSS. Do not invent it silently: rebuild it on purpose (for example with WebGL / three.js) or leave a clearly marked placeholder.

- **Canvas behind the region** (a background layer that is not in the exported markup): 1512×1190 px
- **3D / media files the page loaded:** texture `https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/noise.png`, texture `https://dogstudio.co/app/themes/portfolio-2018/static/assets/dog/images/dog/final/ASTC/dog_diffuse.dds`, texture `https://dogstudio.co/app/themes/portfolio-2018/static/assets/dog/images/dog/final/ASTC/branches_diffuse.dds`, texture `https://dogstudio.co/app/themes/portfolio-2018/static/assets/dog/images/dog/final/ASTC/branches_normals.dds`, texture `https://dogstudio.co/app/themes/portfolio-2018/static/assets/dog/images/dog/final/ASTC/dog_specular.dds`, model `https://dogstudio.co/app/themes/portfolio-2018/static/assets/dog/models/dog.drc.glb`, normal-map `https://dogstudio.co/app/themes/portfolio-2018/static/assets/dog/images/dog/final/dog_normals.jpg`, matcap `https://dogstudio.co/app/themes/portfolio-2018/static/assets/dog/images/dog/final/matcap-combined-resized.jpg`
- **Markup hints:** `data-matcap`




---

## 4. Original HTML Markup
```html
<main data-router-view="home" role="main" class="pagesnap-region-highlighted">
    <h1 class="u-visually-hidden">Dogstudio</h1>

    <picture class="home-background js-in-view appear-fade in-view">
      <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/background-xxs.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/background-xxs.png">
      <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/background-m.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/background-m.png">
      <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/background-l.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/background-l.png">
      <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/background-xl.png" class="js-lazy loaded" alt="" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/background-xl.png" data-was-processed="true" style="opacity: 0.0176667;">
    </picture>

        
<section class="home-hero js-in-view in-view">
  <h2 class="u-visually-hidden">We Make Good Shit</h2>

  <div class="center">
    <div class="line line--revert line--1"><span class="line-anim"></span></div>
    <div class="line line--2"><span class="line-anim"></span></div>

    <p class="home-hero-title fx-parent">
            
                      <span class="fx-word">
                                  <span class="fx-letter fx-letter--1">W</span>
                                  <span class="fx-letter fx-letter--2">e</span>
                  </span><br>
                      <span class="fx-word">
                                  <span class="fx-letter fx-letter--3">M</span>
                                  <span class="fx-letter fx-letter--4">a</span>
                                  <span class="fx-letter fx-letter--5">k</span>
                                  <span class="fx-letter fx-letter--6">e</span>
                  </span><br>
                      <span class="fx-word">
                                  <span class="fx-letter fx-letter--7">G</span>
                                  <span class="fx-letter fx-letter--8">o</span>
                                  <span class="fx-letter fx-letter--9">o</span>
                                  <span class="fx-letter fx-letter--10">d</span>
                  </span><br>
                      <span class="fx-word">
                                  <span class="fx-letter fx-letter--11">S</span>
                                  <span class="fx-letter fx-letter--12">h</span>
                                  <span class="fx-letter fx-letter--13">i</span>
                                  <span class="fx-letter fx-letter--14">t</span>
                  </span><br>
          </p>

    <a href="https://vimeo.com/836218697" target="_blank" class="home-hero-showreel js-show-showreel">  <span class="svg svg-caret-right">
  	<svg width="6" height="10" aria-label="dogstudio">
    	<use xlink:href="https://dogstudio.co/app/themes/portfolio-2018/static/assets/spritesheet.svg#caret-right"></use> 
  	</svg>
  </span>
 Our Showreel</a>

    <div class="home-hero-content">
      <p class="lead">
        <span>Dogstudio is a multidisciplinary</span>
        <span>creative studio at the intersection</span>
        <span>of art, design and technology.</span>
      </p>

      <p>
        <span>Our goal is to deliver amazing experiences that make</span>
        <span>people talk, and build strategic value for brands, tech,</span>
        <span>entertainment, arts &amp; culture.</span>
      </p>
      <ul>
        <li><a href="https://www.facebook.com/dogstudio/" target="_blank">Facebook</a></li>
        <li><a href="https://www.instagram.com/dogstudio.co/" target="_blank">Instagram</a></li>
        <li><a href="https://dribbble.com/dogstudio" target="_blank">Dribbble</a></li>
        <li><a href="https://twitter.com/Dogstudio" target="_blank">Twitter</a></li>
        <li><a href="https://dogstudio.co/newsletter/">Newsletter</a></li>
      </ul>
    </div>
  </div>
</section>

        
<section class="home-cases">
  <div class="center">
    <h2 class="home-cases-title js-in-view appear-fade-up in-view">Featured projects</h2>

    <div class="line line--revert js-in-view in-view"><span class="line-anim"></span></div>

    <ul class="home-cases-list js-cases-list">
              <li class="js-in-view appear-fade-up in-view"><a href="https://dogstudio.co/cases/tomorrowland/" data-theme="tomorrowland" data-matcap="18, 18"><span>2020 - Ongoing</span> Tomorrowland</a></li>
              <li class="js-in-view appear-fade-up in-view"><a href="https://dogstudio.co/cases/navy-pier/" data-theme="navy-pier" data-matcap="7, 7"><span>2018 - Today</span> Navy Pier</a></li>
              <li class="js-in-view appear-fade-up in-view"><a href="https://dogstudio.co/cases/msi-chicago/" data-theme="msi-chicago" data-matcap="8, 8"><span>2015 - Today</span> MSI Chicago</a></li>
              <li class="js-in-view appear-fade-up in-view"><a href="https://dogstudio.co/cases/voo/" data-theme="this-was-louises-phone" data-matcap="11, 11"><span>2016</span> This Was Louise’s Phone</a></li>
              <li class="js-in-view appear-fade-up in-view"><a href="https://dogstudio.co/cases/kikk-festival-2018/" data-theme="kikk-18" data-matcap="9, 9"><span>2012 - Today</span> KIKK Festival 2018</a></li>
              <li class="js-in-view appear-fade-up in-view"><a href="https://dogstudio.co/cases/the-kennedy-center/" data-theme="the-kennedy-center" data-matcap="10, 10"><span>2017</span> The Kennedy Center</a></li>
              <li class="js-in-view appear-fade-up in-view"><a href="https://dogstudio.co/cases/royal-opera-of-wallonia/" data-theme="orw" data-matcap="12, 12"><span>2016 - Ongoing</span> Royal Opera Of Wallonia</a></li>
          </ul>
  </div>

  <div class="home-cases-scenes on-top is-sticky">
          <div class="home-cases-scene home-cases-scene--tomorrowland is-hidden">
        <h3 class="u-visually-hidden">Tomorrowland</h3>

        <div class="inner">
          <a href="https://dogstudio.co/cases/tomorrowland/" class="home-cases-link"><span class="u-visually-hidden">Tomorrowland</span></a>

          <div class="home-cases-content">
                          <p class="home-cases-headline">Web</p>
            
            <p class="home-cases-name">Tomorrowland</p>
            <p class="home-cases-text">
                            
                              <span class="home-cases-line">Building a new kind of</span>
                              <span class="home-cases-line">
immersive experience for</span>
                              <span class="home-cases-line">
the famous music festival</span>
                          </p>
            <p class="link link--caret">
              <span class="link--caret-text">Discover</span>
                <span class="svg svg-caret-right">
  	<svg width="7" height="11">
    	<use xlink:href="https://dogstudio.co/app/themes/portfolio-2018/static/assets/spritesheet.svg#caret-right"></use> 
  	</svg>
  </span>

            </p>
          </div>

          <picture class="home-cases-picture">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-450.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-450.png">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-815.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-815.png">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-1015.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-1015.png">
            <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-1440.png" alt="" class="js-lazy loaded" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-1440.png" data-was-processed="true">
          </picture>
        </div>
      </div>
          <div class="home-cases-scene home-cases-scene--navy-pier is-hidden">
        <h3 class="u-visually-hidden">Navy Pier</h3>

        <div class="inner">
          <a href="https://dogstudio.co/cases/navy-pier/" class="home-cases-link"><span class="u-visually-hidden">Navy Pier</span></a>

          <div class="home-cases-content">
                          <p class="home-cases-headline">Strategy</p>
            
            <p class="home-cases-name">Navy Pier</p>
            <p class="home-cases-text">
                            
                              <span class="home-cases-line">"Enchanted Waters" is an immersive</span>
                              <span class="home-cases-line">
and uplifting reflection on Chicago’s</span>
                              <span class="home-cases-line">
relationship with Lake Michigan</span>
                          </p>
            <p class="link link--caret">
              <span class="link--caret-text">Discover</span>
                <span class="svg svg-caret-right">
  	<svg width="7" height="11">
    	<use xlink:href="https://dogstudio.co/app/themes/portfolio-2018/static/assets/spritesheet.svg#caret-right"></use> 
  	</svg>
  </span>

            </p>
          </div>

          <picture class="home-cases-picture">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-450.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-450.png">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-815.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-815.png">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-1015.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-1015.png">
            <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-1440.png" alt="" class="js-lazy loaded" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-1440.png" data-was-processed="true">
          </picture>
        </div>
      </div>
          <div class="home-cases-scene home-cases-scene--msi-chicago is-hidden">
        <h3 class="u-visually-hidden">MSI Chicago</h3>

        <div class="inner">
          <a href="https://dogstudio.co/cases/msi-chicago/" class="home-cases-link"><span class="u-visually-hidden">MSI Chicago</span></a>

          <div class="home-cases-content">
                          <p class="home-cases-headline">Strategy</p>
            
            <p class="home-cases-name">MSI Chicago</p>
            <p class="home-cases-text">
                            
                              <span class="home-cases-line">Rethinking, redesigning and improving </span>
                              <span class="home-cases-line">
the website of the great &amp; famous </span>
                              <span class="home-cases-line">
Museum of Science and Industry of Chicago</span>
                          </p>
            <p class="link link--caret">
              <span class="link--caret-text">Discover</span>
                <span class="svg svg-caret-right">
  	<svg width="7" height="11">
    	<use xlink:href="https://dogstudio.co/app/themes/portfolio-2018/static/assets/spritesheet.svg#caret-right"></use> 
  	</svg>
  </span>

            </p>
          </div>

          <picture class="home-cases-picture">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-450.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-450.png">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-815.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-815.png">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-1015.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-1015.png">
            <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-1440.png" alt="" class="js-lazy loaded" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-1440.png" data-was-processed="true">
          </picture>
        </div>
      </div>
          <div class="home-cases-scene home-cases-scene--this-was-louises-phone is-visible">
        <h3 class="u-visually-hidden">This Was Louise’s Phone</h3>

        <div class="inner">
          <a href="https://dogstudio.co/cases/voo/" class="home-cases-link"><span class="u-visually-hidden">This Was Louise’s Phone</span></a>

          <div class="home-cases-content">
                          <p class="home-cases-headline">Design</p>
            
            <p class="home-cases-name">This Was Louise’s Phone</p>
            <p class="home-cases-text">
                            
                              <span class="home-cases-line">Creating a heart-moving immersive </span>
                              <span class="home-cases-line">
experience to educate people about </span>
                              <span class="home-cases-line">
the hell of cyber-bullying</span>
                          </p>
            <p class="link link--caret">
              <span class="link--caret-text">Discover</span>
                <span class="svg svg-caret-right">
  	<svg width="7" height="11">
    	<use xlink:href="https://dogstudio.co/app/themes/portfolio-2018/static/assets/spritesheet.svg#caret-right"></use> 
  	</svg>
  </span>

            </p>
          </div>

          <picture class="home-cases-picture">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-450.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-450.png">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-815.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-815.png">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-1015.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-1015.png">
            <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-1440.png" alt="" class="js-lazy loaded" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-1440.png" data-was-processed="true">
          </picture>
        </div>
      </div>
          <div class="home-cases-scene home-cases-scene--kikk-18 is-hidden">
        <h3 class="u-visually-hidden">KIKK Festival 2018</h3>

        <div class="inner">
          <a href="https://dogstudio.co/cases/kikk-festival-2018/" class="home-cases-link"><span class="u-visually-hidden">KIKK Festival 2018</span></a>

          <div class="home-cases-content">
                          <p class="home-cases-headline">Design</p>
            
            <p class="home-cases-name">KIKK Festival 2018</p>
            <p class="home-cases-text">
                            
                              <span class="home-cases-line">Another KIKK Festival yearly revamp: The “Species and Beyond” edition</span>
                          </p>
            <p class="link link--caret">
              <span class="link--caret-text">Discover</span>
                <span class="svg svg-caret-right">
  	<svg width="7" height="11">
    	<use xlink:href="https://dogstudio.co/app/themes/portfolio-2018/static/assets/spritesheet.svg#caret-right"></use> 
  	</svg>
  </span>

            </p>
          </div>

          <picture class="home-cases-picture">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-450.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-450.png">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-815.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-815.png">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-1015.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-1015.png">
            <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-1440.png" alt="" class="js-lazy loaded" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-1440.png" data-was-processed="true">
          </picture>
        </div>
      </div>
          <div class="home-cases-scene home-cases-scene--the-kennedy-center is-hidden">
        <h3 class="u-visually-hidden">The Kennedy Center</h3>

        <div class="inner">
          <a href="https://dogstudio.co/cases/the-kennedy-center/" class="home-cases-link"><span class="u-visually-hidden">The Kennedy Center</span></a>

          <div class="home-cases-content">
                          <p class="home-cases-headline">Design</p>
            
            <p class="home-cases-name">The Kennedy Center</p>
            <p class="home-cases-text">
                            
                              <span class="home-cases-line">Building an immersive website</span>
                              <span class="home-cases-line">
to celebrate the memory of the</span>
                              <span class="home-cases-line">
unforgettable John F. Kennedy</span>
                          </p>
            <p class="link link--caret">
              <span class="link--caret-text">Discover</span>
                <span class="svg svg-caret-right">
  	<svg width="7" height="11">
    	<use xlink:href="https://dogstudio.co/app/themes/portfolio-2018/static/assets/spritesheet.svg#caret-right"></use> 
  	</svg>
  </span>

            </p>
          </div>

          <picture class="home-cases-picture">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-450.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-450.png">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-815.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-815.png">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-1015.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-1015.png">
            <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-1440.png" alt="" class="js-lazy loaded" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-1440.png" data-was-processed="true">
          </picture>
        </div>
      </div>
          <div class="home-cases-scene home-cases-scene--orw is-hidden">
        <h3 class="u-visually-hidden">Royal Opera Of Wallonia</h3>

        <div class="inner">
          <a href="https://dogstudio.co/cases/royal-opera-of-wallonia/" class="home-cases-link"><span class="u-visually-hidden">Royal Opera Of Wallonia</span></a>

          <div class="home-cases-content">
                          <p class="home-cases-headline">Design</p>
            
            <p class="home-cases-name">Royal Opera Of Wallonia</p>
            <p class="home-cases-text">
                            
                              <span class="home-cases-line">Imagining and designing an oniric</span>
                              <span class="home-cases-line">
universe to promote the upcoming</span>
                              <span class="home-cases-line">
season of a renown Belgian opera house</span>
                          </p>
            <p class="link link--caret">
              <span class="link--caret-text">Discover</span>
                <span class="svg svg-caret-right">
  	<svg width="7" height="11">
    	<use xlink:href="https://dogstudio.co/app/themes/portfolio-2018/static/assets/spritesheet.svg#caret-right"></use> 
  	</svg>
  </span>

            </p>
          </div>

          <picture class="home-cases-picture">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-450.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-450.png">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-815.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-815.png">
            <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-1015.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-1015.png">
            <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-1440.png" alt="" class="js-lazy loaded" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-1440.png" data-was-processed="true">
          </picture>
        </div>
      </div>
      </div>
</section>

        <section class="home-about js-in-view in-view">
  <h2 class="u-visually-hidden">We're crafting emotional experiences aimed at improving results</h2>

  <picture class="home-about-background js-in-view appear-fade in-view">
    <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/about-xxs.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/about-xxs.png">
    <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/about-m.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/about-m.png">
    <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/about-l.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/about-l.png">
    <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/about-xl.png" class="js-lazy loaded" alt="" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/about-xl.png" data-was-processed="true">
  </picture>

  <div class="center">
    <header class="home-about-header js-in-view in-view">
      <p class="home-about-headline appear-fade-up">This is how we do it</p>
      <p class="home-about-title fx-parent">

                
                            <span class="fx-word">
                                        <span class="fx-letter fx-letter--1">W</span>
                                        <span class="fx-letter fx-letter--2">e</span>
                                        <span class="fx-letter fx-letter--3">'</span>
                                        <span class="fx-letter fx-letter--4">r</span>
                                        <span class="fx-letter fx-letter--5">e</span>
                      </span>

                                      <span class="fx-word">
                                        <span class="fx-letter fx-letter--6">c</span>
                                        <span class="fx-letter fx-letter--7">r</span>
                                        <span class="fx-letter fx-letter--8">a</span>
                                        <span class="fx-letter fx-letter--9">f</span>
                                        <span class="fx-letter fx-letter--10">t</span>
                                        <span class="fx-letter fx-letter--11">i</span>
                                        <span class="fx-letter fx-letter--12">n</span>
                                        <span class="fx-letter fx-letter--13">g</span>
                      </span>

          <br>                            <span class="fx-word">
                                        <span class="fx-letter fx-letter--14">e</span>
                                        <span class="fx-letter fx-letter--15">m</span>
                                        <span class="fx-letter fx-letter--16">o</span>
                                        <span class="fx-letter fx-letter--17">t</span>
                                        <span class="fx-letter fx-letter--18">i</span>
                                        <span class="fx-letter fx-letter--19">o</span>
                                        <span class="fx-letter fx-letter--20">n</span>
                                        <span class="fx-letter fx-letter--21">a</span>
                                        <span class="fx-letter fx-letter--22">l</span>
                      </span>

          <br>                            <span class="fx-word">
                                        <span class="fx-letter fx-letter--23">e</span>
                                        <span class="fx-letter fx-letter--24">x</span>
                                        <span class="fx-letter fx-letter--25">p</span>
                                        <span class="fx-letter fx-letter--26">e</span>
                                        <span class="fx-letter fx-letter--27">r</span>
                                        <span class="fx-letter fx-letter--28">i</span>
                                        <span class="fx-letter fx-letter--29">e</span>
                                        <span class="fx-letter fx-letter--30">n</span>
                                        <span class="fx-letter fx-letter--31">c</span>
                                        <span class="fx-letter fx-letter--32">e</span>
                                        <span class="fx-letter fx-letter--33">s</span>
                      </span>

                                      <span class="fx-word">
                                        <span class="fx-letter fx-letter--34">a</span>
                                        <span class="fx-letter fx-letter--35">i</span>
                                        <span class="fx-letter fx-letter--36">m</span>
                                        <span class="fx-letter fx-letter--37">e</span>
                                        <span class="fx-letter fx-letter--38">d</span>
                      </span>

          <br>                            <span class="fx-word">
                                        <span class="fx-letter fx-letter--39">a</span>
                                        <span class="fx-letter fx-letter--40">t</span>
                      </span>

                                      <span class="fx-word">
                                        <span class="fx-letter fx-letter--41">i</span>
                                        <span class="fx-letter fx-letter--42">m</span>
                                        <span class="fx-letter fx-letter--43">p</span>
                                        <span class="fx-letter fx-letter--44">r</span>
                                        <span class="fx-letter fx-letter--45">o</span>
                                        <span class="fx-letter fx-letter--46">v</span>
                                        <span class="fx-letter fx-letter--47">i</span>
                                        <span class="fx-letter fx-letter--48">n</span>
                                        <span class="fx-letter fx-letter--49">g</span>
                      </span>

          <br>                            <span class="fx-word">
                                        <span class="fx-letter fx-letter--50">r</span>
                                        <span class="fx-letter fx-letter--51">e</span>
                                        <span class="fx-letter fx-letter--52">s</span>
                                        <span class="fx-letter fx-letter--53">u</span>
                                        <span class="fx-letter fx-letter--54">l</span>
                                        <span class="fx-letter fx-letter--55">t</span>
                                        <span class="fx-letter fx-letter--56">s</span>
                      </span>

                        </p>
    </header>

    <div class="home-about-content js-in-view in-view">
      <div class="line"><span class="line-anim"></span></div>

      <div class="home-about-text typeset">
        <p class="appear-fade-up appear-delay--3">Dogstudio is a design &amp; technology firm working globally from our offices based in Belgium and Chicago.<br> Our strong focus on producing high quality &amp; emotional brandings, digital products and experiences became a signature.</p>
        <p class="appear-fade-up appear-delay--4">We’re passionate about moving people and solving problems for the likes of Microsoft, The Museum of Science And Industry Of Chicago, The Kennedy Center of Washington, Dragone, Quanta Magazine, and many more.</p>
      </div>

      <a href="https://dogstudio.co/values/" class="home-about-link link link--under" title="Discover our values">
        <span class="link-label">Discover our values</span>
        <span class="link-line"></span>
        <span class="link-line--anim"></span>
      </a>
    </div>
  </div>
</section>
  </main>
```

## 3b. Render surfaces (NOT in this export)

Part of this region is drawn outside HTML and CSS. The exported markup and styles show none of it, and none of it can be read from the page's CSS. Do not invent it silently: rebuild it on purpose (for example with WebGL / three.js) or leave a clearly marked placeholder.

- **Canvas behind the region** (a background layer that is not in the exported markup): 1512×1190 px
- **3D / media files the page loaded:** texture `https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/noise.png`, texture `https://dogstudio.co/app/themes/portfolio-2018/static/assets/dog/images/dog/final/ASTC/dog_diffuse.dds`, texture `https://dogstudio.co/app/themes/portfolio-2018/static/assets/dog/images/dog/final/ASTC/branches_diffuse.dds`, texture `https://dogstudio.co/app/themes/portfolio-2018/static/assets/dog/images/dog/final/ASTC/branches_normals.dds`, texture `https://dogstudio.co/app/themes/portfolio-2018/static/assets/dog/images/dog/final/ASTC/dog_specular.dds`, model `https://dogstudio.co/app/themes/portfolio-2018/static/assets/dog/models/dog.drc.glb`, normal-map `https://dogstudio.co/app/themes/portfolio-2018/static/assets/dog/images/dog/final/dog_normals.jpg`, matcap `https://dogstudio.co/app/themes/portfolio-2018/static/assets/dog/images/dog/final/matcap-combined-resized.jpg`
- **Markup hints:** `data-matcap`




## 3c. Interaction Manifest (Cross-Layer 3D & DOM Hover Transitions)

The component binds DOM hover interactions to 3D WebGL material slots and background scenes:

- **Item [1]: `2020 - ONGOING Tomorrowland`**
  - Trigger Theme: `tomorrowland`
  - 3D Matcap Target Slot: `Index 18`
  - Associated Artwork Image: `https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-1440.png`
- **Item [2]: `2018 - TODAY Navy Pier`**
  - Trigger Theme: `navy-pier`
  - 3D Matcap Target Slot: `Index 7`
  - Associated Artwork Image: `https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-1440.png`
- **Item [3]: `2015 - TODAY MSI Chicago`**
  - Trigger Theme: `msi-chicago`
  - 3D Matcap Target Slot: `Index 8`
  - Associated Artwork Image: `https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-1440.png`
- **Item [4]: `2016 This Was Louise’s Phone`**
  - Trigger Theme: `this-was-louises-phone`
  - 3D Matcap Target Slot: `Index 11`
  - Associated Artwork Image: `https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-1440.png`
- **Item [5]: `2012 - TODAY KIKK Festival 2018`**
  - Trigger Theme: `kikk-18`
  - 3D Matcap Target Slot: `Index 9`
  - Associated Artwork Image: `https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-1440.png`
- **Item [6]: `2017 The Kennedy Center`**
  - Trigger Theme: `the-kennedy-center`
  - 3D Matcap Target Slot: `Index 10`
  - Associated Artwork Image: `https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-1440.png`
- **Item [7]: `2016 - ONGOING Royal Opera Of Wallonia`**
  - Trigger Theme: `orw`
  - 3D Matcap Target Slot: `Index 12`
  - Associated Artwork Image: `https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-1440.png`

> **Choreography Rule for AI:** When user hovers an item, transition the Three.js model matcap material to its assigned target slot (e.g. 0.4s ease), fade in its artwork scene, and dim inactive items to opacity 0.15. On mouseleave, restore resting matcap (Slot 0).


## 3d. 3D Submesh & Material Binding (Prevent Material Overwriting)

When traversing the loaded 3D model, bind textures specifically to each named submesh:

| Submesh Name Pattern | Target Maps | Special Guidance |
| --- | --- | --- |
| `eyes` | diffuse: `dog_diffuse.dds`, matcap: `matcap-combined-resized.jpg` | DO NOT overwrite with generic blank matcap material. Keep diffuse map with amber/cyan pupil and specular catchlight reflection. |
| `body` | normalMap: `branches_normals.dds`, matcap: `matcap-combined-resized.jpg` | Apply MeshMatcapMaterial with normalMap (flipY: false) and dark midnight navy ambient tinting (0x161c28). |
| `foliage` | diffuse: `branches_diffuse.dds`, normalMap: `branches_normals.dds` | Preserve alpha clipping on leaves and apply branches normal maps. |


### Cross-Layer 3D Hover Binding & Controller Blueprint
The page links DOM hover events to 3D model color/texture changes AND background artwork reveals:
- **Element `2020 - ONGOING
Tomorrowland`:** `data-matcap="18, 18"`
- **Element `2018 - TODAY
Navy Pier`:** `data-matcap="7, 7"`
- **Element `2015 - TODAY
MSI Chicago`:** `data-matcap="8, 8"`
- **Element `2016
This Was Louise’s Phone`:** `data-matcap="11, 11"`
- **Element `2012 - TODAY
KIKK Festival 2018`:** `data-matcap="9, 9"`
- **Element `2017
The Kennedy Center`:** `data-matcap="10, 10"`
- **Element `2016 - ONGOING
Royal Opera Of Wallonia`:** `data-matcap="12, 12"`

```javascript
// Controller Blueprint for AI:
link.addEventListener("mouseenter", () => {
  // 1. Reveal associated artwork scene layer
  document.querySelectorAll(".home-cases-scene").forEach(s => s.classList.remove("is-visible"));
  const targetScene = document.querySelector(`.home-cases-scene--${theme}`);
  if (targetScene) targetScene.classList.add("is-visible");
  // 2. Smoothly transition 3D matcap material to target slot
  transitionMatcap(targetSlot);
});
```

### Empirical Human Interaction Log (Recorded Live Session)
During the live inspection session, real user interactions were recorded:
- **Scroll Trail (119 samples):** Max scroll reached: 2964px
- **Hover Events (133 events):** `[main]
🔼 Expand
🔽 Shrink
🎯 Pick
⚠ Can`, `⏹ Stop Record`, `[main]
🔼 Expand
🔽 Shrink
🎯 Pick
⚠ Can`, `⏹ Stop Record`, `W
e


M
a
k
e


G
o
o
d


S
h
i
t



 Ou`, `Dogstudio is a multidisciplinary`, `creative studio at the intersection`, `of art, design and technology.`, `Dogstudio is a multidisciplinary
creativ`, `Our goal is to deliver amazing experienc`, `people talk, and build strategic value f`, `entertainment, arts & culture.`, `Dogstudio is a multidisciplinary
creativ`, `Instagram`, `DESIGN

Imagining and designing an oniri`, `img`, `2020 - ONGOING
Tomorrowland` (matcap: 18, 18), `2018 - TODAY
Navy Pier` (matcap: 7, 7), `2020 - ONGOING
Tomorrowland` (matcap: 18, 18), `2018 - TODAY
Navy Pier` (matcap: 7, 7), `2015 - TODAY
MSI Chicago` (matcap: 8, 8), `2016
This Was Louise’s Phone` (matcap: 11, 11), `2012 - TODAY
KIKK Festival 2018` (matcap: 9, 9), `2017
The Kennedy Center` (matcap: 10, 10), `2016 - ONGOING
Royal Opera Of Wallonia` (matcap: 12, 12), `img`, `DESIGN

Imagining and designing an oniri`, `We're crafting emotional experiences aim`, `[main]
🔼 Expand
🔽 Shrink
🎯 Pick
⚠ Can`, `⏹ Stop Record`, `[main]
🔼 Expand
🔽 Shrink
🎯 Pick
⚠ Can`, `We're crafting emotional experiences aim`, `Chicago .
Amsterdam .
Paris .
Contact us`, `Amsterdam .`, `Chicago .
Amsterdam .
Paris .
Contact us`, `We're crafting emotional experiences aim`, `Contact us`, `Contact us
Fb
Ins
Dri
Tw`, `Ins`, `Chicago .
Amsterdam .
Paris .
Contact us`, `Dri`, `Contact us
Fb
Ins
Dri
Tw`, `Ins`, `Fb`, `Fb`, `Fb`, `Fb
Ins
Dri
Tw`, `Fb`, `Fb`, `Fb`, `Ins`, `Fb`, `Contact us
Fb
Ins
Dri
Tw`, `Contact us`, `Chicago .
Amsterdam .
Paris .
Contact us`, `We're crafting emotional experiences aim`, `Dogstudio is a design & technology firm `, `Dogstudio is a design & technology firm `, `We’re passionate about moving people and`, `We're crafting emotional experiences aim`, `We’re passionate about moving people and`, `Dogstudio is a design & technology firm `, `Dogstudio is a design & technology firm `, `We're crafting emotional experiences aim`, `DESIGN

Imagining and designing an oniri`, `img`, `Imagining and designing an oniric
univer`, `season of a renown Belgian opera house`, `universe to promote the upcoming`, `Imagining and designing an oniric`, `universe to promote the upcoming`, `season of a renown Belgian opera house`, `img`, `DESIGN

Imagining and designing an oniri`, `We're crafting emotional experiences aim`, `DESIGN

Imagining and designing an oniri`, `Imagining and designing an oniric
univer`, `season of a renown Belgian opera house`, `universe to promote the upcoming`, `Imagining and designing an oniric`, `img`, `2016 - ONGOING
Royal Opera Of Wallonia` (matcap: 12, 12), `2017
The Kennedy Center` (matcap: 10, 10), `2016 - ONGOING
Royal Opera Of Wallonia` (matcap: 12, 12), `img`, `2016 - ONGOING
Royal Opera Of Wallonia` (matcap: 12, 12), `2017
The Kennedy Center` (matcap: 10, 10), `2012 - TODAY
KIKK Festival 2018` (matcap: 9, 9), `2016
This Was Louise’s Phone` (matcap: 11, 11), `2015 - TODAY
MSI Chicago` (matcap: 8, 8), `2016
This Was Louise’s Phone` (matcap: 11, 11), `2015 - TODAY
MSI Chicago` (matcap: 8, 8), `2018 - TODAY
Navy Pier` (matcap: 7, 7), `2020 - ONGOING
Tomorrowland` (matcap: 18, 18), `img`, `DESIGN

Imagining and designing an oniri`, `W
e


M
a
k
e


G
o
o
d


S
h
i
t



 Ou`, `DESIGN

Imagining and designing an oniri`, `img`, `DESIGN

Imagining and designing an oniri`, `Instagram`, `Dogstudio is a multidisciplinary
creativ`, `entertainment, arts & culture.`, `people talk, and build strategic value f`, `Our goal is to deliver amazing experienc`, `W
e


M
a
k
e


G
o
o
d


S
h
i
t



 Ou`, `DESIGN

Imagining and designing an oniri`, `img`, `DESIGN

Imagining and designing an oniri`, `W
e


M
a
k
e


G
o
o
d


S
h
i
t



 Ou`, `We Make Good Shit

W
e


M
a
k
e


G
o
o`, `W
e


M
a
k
e


G
o
o
d


S
h
i
t



 Ou`, `W
e


M
a
k
e


G
o
o
d


S
h
i
t



 Ou`, `Our Showreel`, `W
e


M
a
k
e


G
o
o
d


S
h
i
t



 Ou`, `We Make Good Shit

W
e


M
a
k
e


G
o
o`, `W
e


M
a
k
e


G
o
o
d


S
h
i
t



 Ou`, `[main]
🔼 Expand
🔽 Shrink
🎯 Pick
⚠ Can`, `⚠ Canvas 1512×1190 not exported`, `[main]
🔼 Expand
🔽 Shrink
🎯 Pick
⚠ Can`, `⏹ Stop Record`, `[main]
🔼 Expand
🔽 Shrink
🎯 Pick
⚠ Can`, `W
e


M
a
k
e


G
o
o
d


S
h
i
t



 Ou`, `[main]
🔼 Expand
🔽 Shrink
🎯 Pick
⚠ Can`, `📦 Download ZIP`, `Copy code · no JS`, `[main]
🔼 Expand
🔽 Shrink
🎯 Pick
⚠ Can`, `Dogstudio is a multidisciplinary`, `W
e


M
a
k
e


G
o
o
d


S
h
i
t



 Ou`, `We Make Good Shit

W
e


M
a
k
e


G
o
o`, `W
e


M
a
k
e


G
o
o
d


S
h
i
t



 Ou`, `[main]
🔼 Expand
🔽 Shrink
🎯 Pick
⚠ Can`, `⏹ Stop Record`
> **Note for AI:** Use `interaction-recording.json` to calibrate real user-triggered state transitions.
---
## 5. Instruction for AI Agent (Implementation Blueprint for Cursor / Claude / v0)
```
// plan-exempt — ps-008: webgl-scaffold reference in AI prompt. routing-override: skipped — user requested webgl-scaffold generator.
You are a senior Frontend Engineer specializing in Tailwind CSS, Framer Motion, and Three.js/WebGL.
- WebGL / Three.js Scaffold: A pre-configured `webgl-scaffold.js` is included in this package with verified camera perspective (FOV 35), DRACO/GLTF loaders, dedicated eye materials with glowing amber pupils, and cross-layer hover bindings. Integrate or reference `webgl-scaffold.js` directly rather than guessing Three.js boilerplate from scratch.
- Multi-Frame Visual Grounding Reference: Three visual grounding captures are provided: `preview-hero.png` (top hero view), `preview-mid.png` (middle section), and `preview-bottom.png` (bottom section). Inspect all three to verify camera perspective, model scale, and rotation transitions across scrolling.
- 3D Material & Ambient Tone: Apply a dark midnight navy tint (0x161c28 or 0x28344c) to the matcap material so the 3D model blends into the dark background instead of appearing as a washed-out cyan/white.
- 3D Eye & Specular Detailing: Give the eyes a dedicated specular material with a realistic glowing amber pupil making piercing direct eye contact in the hero frame, matching `preview-hero.png`.
- Scroll Choreography: Connect 3D camera / object transforms (depth, rotation, x/y offsets) to scroll progress so the 3D model rotates ~180 degrees showing its back at the bottom section.
- Framework: React (TypeScript) / Three.js
- Styling: Tailwind CSS
- Animation: Framer Motion / Three.js (matching specs and the 3 preview frames)
- Produce clean, modern, accessible, and responsive component code.

### Suggested Framer Motion Patterns:

export function MorphingSvgPath({ initialD, targetD }: { initialD: string, targetD: string }) {
  return (
    <motion.path
      initial={{ d: initialD }}
      whileHover={{ d: targetD }}
      transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
    />
  );
}
```

2. For Interactive Element Lift / Hover:
```tsx
export function LiftingCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -16 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```
```

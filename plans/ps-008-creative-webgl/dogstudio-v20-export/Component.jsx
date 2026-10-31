import React from 'react';
import './styles.css';

export default function ExtractedComponent() {
  return (
    <div className="pagesnap-component-wrapper">
      <main data-router-view="home" role="main" className="ps-el-0">
        <h1 className="u-visually-hidden ps-el-1">Dogstudio</h1>
        <picture className="home-background js-in-view appear-fade in-view ps-el-2">
          <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/background-xxs.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/background-xxs.png" className="ps-el-3" />
          <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/background-m.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/background-m.png" className="ps-el-4" />
          <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/background-l.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/background-l.png" className="ps-el-5" />
          {/* [PageSnap Motion Note] .ps-el-6 (img): Interactive style toggle (opacity: 1; -> opacity: 0;) — see AI-PROMPT.md */}
          <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/background-xl.png" className="js-lazy loaded ps-el-6" alt="" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/background-xl.png" data-was-processed="true" />
        </picture>
        <section className="home-hero js-in-view in-view ps-el-7">
          <h2 className="u-visually-hidden ps-el-8">We Make Good Shit</h2>
          <div className="center ps-el-9">
            <div className="line line--revert line--1 ps-el-10">
              <span className="line-anim ps-el-11">
              </span>
            </div>
            <div className="line line--2 ps-el-12">
              <span className="line-anim ps-el-13">
              </span>
            </div>
            <p className="home-hero-title fx-parent ps-el-14">
              <span className="fx-word ps-el-15">
                <span className="fx-letter fx-letter--1 ps-el-16">W</span>
                <span className="fx-letter fx-letter--2 ps-el-17">e</span>
              </span>
              <br className="ps-el-18" />
              <span className="fx-word ps-el-19">
                <span className="fx-letter fx-letter--3 ps-el-20">M</span>
                <span className="fx-letter fx-letter--4 ps-el-21">a</span>
                <span className="fx-letter fx-letter--5 ps-el-22">k</span>
                <span className="fx-letter fx-letter--6 ps-el-23">e</span>
              </span>
              <br className="ps-el-24" />
              <span className="fx-word ps-el-25">
                <span className="fx-letter fx-letter--7 ps-el-26">G</span>
                <span className="fx-letter fx-letter--8 ps-el-27">o</span>
                <span className="fx-letter fx-letter--9 ps-el-28">o</span>
                <span className="fx-letter fx-letter--10 ps-el-29">d</span>
              </span>
              <br className="ps-el-30" />
              <span className="fx-word ps-el-31">
                <span className="fx-letter fx-letter--11 ps-el-32">S</span>
                <span className="fx-letter fx-letter--12 ps-el-33">h</span>
                <span className="fx-letter fx-letter--13 ps-el-34">i</span>
                <span className="fx-letter fx-letter--14 ps-el-35">t</span>
              </span>
              <br className="ps-el-36" />
            </p>
            <a href="https://vimeo.com/836218697" target="_blank" className="home-hero-showreel js-show-showreel ps-el-37">
              <span className="svg svg-caret-right ps-el-38">
                <svg width="6" height="10" aria-label="dogstudio" className="ps-el-39">
                  <use xlink:href="https://dogstudio.co/app/themes/portfolio-2018/static/assets/spritesheet.svg#caret-right" className="ps-el-40">
                  </use>
                </svg>
              </span>
              Our Showreel</a>
              <div className="home-hero-content ps-el-41">
                <p className="lead ps-el-42">
                  <span className="ps-el-43">Dogstudio is a multidisciplinary</span>
                  <span className="ps-el-44">creative studio at the intersection</span>
                  <span className="ps-el-45">of art, design and technology.</span>
                </p>
                <p className="ps-el-46">
                  <span className="ps-el-47">Our goal is to deliver amazing experiences that make</span>
                  <span className="ps-el-48">people talk, and build strategic value for brands, tech,</span>
                  <span className="ps-el-49">entertainment, arts &amp; culture.</span>
                </p>
                <ul className="ps-el-50">
                  <li className="ps-el-51">
                    <a href="https://www.facebook.com/dogstudio/" target="_blank" className="ps-el-52">Facebook</a>
                  </li>
                  <li className="ps-el-53">
                    <a href="https://www.instagram.com/dogstudio.co/" target="_blank" className="ps-el-54">Instagram</a>
                  </li>
                  <li className="ps-el-55">
                    <a href="https://dribbble.com/dogstudio" target="_blank" className="ps-el-56">Dribbble</a>
                  </li>
                  <li className="ps-el-57">
                    <a href="https://twitter.com/Dogstudio" target="_blank" className="ps-el-58">Twitter</a>
                  </li>
                  <li className="ps-el-59">
                    <a href="https://dogstudio.co/newsletter/" className="ps-el-60">Newsletter</a>
                  </li>
                </ul>
              </div>
            </div>
          </section>
          <section className="home-cases ps-el-61">
            <div className="center ps-el-62">
              <h2 className="home-cases-title js-in-view appear-fade-up in-view ps-el-63">Featured projects</h2>
              <div className="line line--revert js-in-view in-view ps-el-64">
                <span className="line-anim ps-el-65">
                </span>
              </div>
              <ul className="home-cases-list js-cases-list ps-el-66">
                <li className="js-in-view appear-fade-up in-view ps-el-67">
                  <a href="https://dogstudio.co/cases/tomorrowland/" data-theme="tomorrowland" data-matcap="18, 18" className="ps-el-68">
                    <span className="ps-el-69">2020 - Ongoing</span> Tomorrowland</a>
                  </li>
                  <li className="js-in-view appear-fade-up in-view ps-el-70">
                    <a href="https://dogstudio.co/cases/navy-pier/" data-theme="navy-pier" data-matcap="7, 7" className="ps-el-71">
                      <span className="ps-el-72">2018 - Today</span> Navy Pier</a>
                    </li>
                    <li className="js-in-view appear-fade-up in-view ps-el-73">
                      <a href="https://dogstudio.co/cases/msi-chicago/" data-theme="msi-chicago" data-matcap="8, 8" className="ps-el-74">
                        <span className="ps-el-75">2015 - Today</span> MSI Chicago</a>
                      </li>
                      <li className="js-in-view appear-fade-up in-view ps-el-76">
                        <a href="https://dogstudio.co/cases/voo/" data-theme="this-was-louises-phone" data-matcap="11, 11" className="ps-el-77">
                          <span className="ps-el-78">2016</span> This Was Louise’s Phone</a>
                        </li>
                        <li className="js-in-view appear-fade-up in-view ps-el-79">
                          <a href="https://dogstudio.co/cases/kikk-festival-2018/" data-theme="kikk-18" data-matcap="9, 9" className="ps-el-80">
                            <span className="ps-el-81">2012 - Today</span> KIKK Festival 2018</a>
                          </li>
                          <li className="js-in-view appear-fade-up in-view ps-el-82">
                            <a href="https://dogstudio.co/cases/the-kennedy-center/" data-theme="the-kennedy-center" data-matcap="10, 10" className="ps-el-83">
                              <span className="ps-el-84">2017</span> The Kennedy Center</a>
                            </li>
                            <li className="js-in-view appear-fade-up in-view ps-el-85">
                              <a href="https://dogstudio.co/cases/royal-opera-of-wallonia/" data-theme="orw" data-matcap="12, 12" className="ps-el-86">
                                <span className="ps-el-87">2016 - Ongoing</span> Royal Opera Of Wallonia</a>
                              </li>
                            </ul>
                          </div>
                          {/* [PageSnap Motion Note] .ps-el-88 (div): JS class morph (26 frames over ~315ms, delta: 0px) — see AI-PROMPT.md */}
                          <div className="home-cases-scenes on-bottom ps-el-88">
                            <div className="home-cases-scene home-cases-scene--tomorrowland ps-el-89">
                              <h3 className="u-visually-hidden ps-el-90">Tomorrowland</h3>
                              <div className="inner ps-el-91">
                                <a href="https://dogstudio.co/cases/tomorrowland/" className="home-cases-link ps-el-92">
                                  <span className="u-visually-hidden ps-el-93">Tomorrowland</span>
                                </a>
                                <div className="home-cases-content ps-el-94">
                                  <p className="home-cases-headline ps-el-95">Web</p>
                                  <p className="home-cases-name ps-el-96">Tomorrowland</p>
                                  <p className="home-cases-text ps-el-97">
                                    <span className="home-cases-line ps-el-98">Building a new kind of</span>
                                    <span className="home-cases-line ps-el-99">
                                      immersive experience for</span>
                                      <span className="home-cases-line ps-el-100">
                                        the famous music festival</span>
                                      </p>
                                      <p className="link link--caret ps-el-101">
                                        <span className="link--caret-text ps-el-102">Discover</span>
                                        <span className="svg svg-caret-right ps-el-103">
                                          <svg width="7" height="11" className="ps-el-104">
                                            <use xlink:href="https://dogstudio.co/app/themes/portfolio-2018/static/assets/spritesheet.svg#caret-right" className="ps-el-105">
                                            </use>
                                          </svg>
                                        </span>
                                      </p>
                                    </div>
                                    <picture className="home-cases-picture ps-el-106">
                                      <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-450.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-450.png" className="ps-el-107" />
                                      <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-815.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-815.png" className="ps-el-108" />
                                      <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-1015.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-1015.png" className="ps-el-109" />
                                      <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-1440.png" alt="" className="js-lazy loaded ps-el-110" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-1440.png" data-was-processed="true" />
                                    </picture>
                                  </div>
                                </div>
                                <div className="home-cases-scene home-cases-scene--navy-pier ps-el-111">
                                  <h3 className="u-visually-hidden ps-el-112">Navy Pier</h3>
                                  <div className="inner ps-el-113">
                                    <a href="https://dogstudio.co/cases/navy-pier/" className="home-cases-link ps-el-114">
                                      <span className="u-visually-hidden ps-el-115">Navy Pier</span>
                                    </a>
                                    <div className="home-cases-content ps-el-116">
                                      <p className="home-cases-headline ps-el-117">Strategy</p>
                                      <p className="home-cases-name ps-el-118">Navy Pier</p>
                                      <p className="home-cases-text ps-el-119">
                                        <span className="home-cases-line ps-el-120">"Enchanted Waters" is an immersive</span>
                                        <span className="home-cases-line ps-el-121">
                                          and uplifting reflection on Chicago’s</span>
                                          <span className="home-cases-line ps-el-122">
                                            relationship with Lake Michigan</span>
                                          </p>
                                          <p className="link link--caret ps-el-123">
                                            <span className="link--caret-text ps-el-124">Discover</span>
                                            <span className="svg svg-caret-right ps-el-125">
                                              <svg width="7" height="11" className="ps-el-126">
                                                <use xlink:href="https://dogstudio.co/app/themes/portfolio-2018/static/assets/spritesheet.svg#caret-right" className="ps-el-127">
                                                </use>
                                              </svg>
                                            </span>
                                          </p>
                                        </div>
                                        <picture className="home-cases-picture ps-el-128">
                                          <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-450.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-450.png" className="ps-el-129" />
                                          <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-815.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-815.png" className="ps-el-130" />
                                          <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-1015.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-1015.png" className="ps-el-131" />
                                          <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-1440.png" alt="" className="js-lazy loaded ps-el-132" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-1440.png" data-was-processed="true" />
                                        </picture>
                                      </div>
                                    </div>
                                    <div className="home-cases-scene home-cases-scene--msi-chicago ps-el-133">
                                      <h3 className="u-visually-hidden ps-el-134">MSI Chicago</h3>
                                      <div className="inner ps-el-135">
                                        <a href="https://dogstudio.co/cases/msi-chicago/" className="home-cases-link ps-el-136">
                                          <span className="u-visually-hidden ps-el-137">MSI Chicago</span>
                                        </a>
                                        <div className="home-cases-content ps-el-138">
                                          <p className="home-cases-headline ps-el-139">Strategy</p>
                                          <p className="home-cases-name ps-el-140">MSI Chicago</p>
                                          <p className="home-cases-text ps-el-141">
                                            <span className="home-cases-line ps-el-142">Rethinking, redesigning and improving </span>
                                            <span className="home-cases-line ps-el-143">
                                              the website of the great &amp; famous </span>
                                              <span className="home-cases-line ps-el-144">
                                                Museum of Science and Industry of Chicago</span>
                                              </p>
                                              <p className="link link--caret ps-el-145">
                                                <span className="link--caret-text ps-el-146">Discover</span>
                                                <span className="svg svg-caret-right ps-el-147">
                                                  <svg width="7" height="11" className="ps-el-148">
                                                    <use xlink:href="https://dogstudio.co/app/themes/portfolio-2018/static/assets/spritesheet.svg#caret-right" className="ps-el-149">
                                                    </use>
                                                  </svg>
                                                </span>
                                              </p>
                                            </div>
                                            <picture className="home-cases-picture ps-el-150">
                                              <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-450.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-450.png" className="ps-el-151" />
                                              <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-815.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-815.png" className="ps-el-152" />
                                              <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-1015.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-1015.png" className="ps-el-153" />
                                              <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-1440.png" alt="" className="js-lazy loaded ps-el-154" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-1440.png" data-was-processed="true" />
                                            </picture>
                                          </div>
                                        </div>
                                        <div className="home-cases-scene home-cases-scene--this-was-louises-phone ps-el-155">
                                          <h3 className="u-visually-hidden ps-el-156">This Was Louise’s Phone</h3>
                                          <div className="inner ps-el-157">
                                            <a href="https://dogstudio.co/cases/voo/" className="home-cases-link ps-el-158">
                                              <span className="u-visually-hidden ps-el-159">This Was Louise’s Phone</span>
                                            </a>
                                            <div className="home-cases-content ps-el-160">
                                              <p className="home-cases-headline ps-el-161">Design</p>
                                              <p className="home-cases-name ps-el-162">This Was Louise’s Phone</p>
                                              <p className="home-cases-text ps-el-163">
                                                <span className="home-cases-line ps-el-164">Creating a heart-moving immersive </span>
                                                <span className="home-cases-line ps-el-165">
                                                  experience to educate people about </span>
                                                  <span className="home-cases-line ps-el-166">
                                                    the hell of cyber-bullying</span>
                                                  </p>
                                                  <p className="link link--caret ps-el-167">
                                                    <span className="link--caret-text ps-el-168">Discover</span>
                                                    <span className="svg svg-caret-right ps-el-169">
                                                      <svg width="7" height="11" className="ps-el-170">
                                                        <use xlink:href="https://dogstudio.co/app/themes/portfolio-2018/static/assets/spritesheet.svg#caret-right" className="ps-el-171">
                                                        </use>
                                                      </svg>
                                                    </span>
                                                  </p>
                                                </div>
                                                <picture className="home-cases-picture ps-el-172">
                                                  <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-450.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-450.png" className="ps-el-173" />
                                                  <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-815.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-815.png" className="ps-el-174" />
                                                  <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-1015.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-1015.png" className="ps-el-175" />
                                                  <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-1440.png" alt="" className="js-lazy loaded ps-el-176" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-1440.png" data-was-processed="true" />
                                                </picture>
                                              </div>
                                            </div>
                                            <div className="home-cases-scene home-cases-scene--kikk-18 ps-el-177">
                                              <h3 className="u-visually-hidden ps-el-178">KIKK Festival 2018</h3>
                                              <div className="inner ps-el-179">
                                                <a href="https://dogstudio.co/cases/kikk-festival-2018/" className="home-cases-link ps-el-180">
                                                  <span className="u-visually-hidden ps-el-181">KIKK Festival 2018</span>
                                                </a>
                                                <div className="home-cases-content ps-el-182">
                                                  <p className="home-cases-headline ps-el-183">Design</p>
                                                  <p className="home-cases-name ps-el-184">KIKK Festival 2018</p>
                                                  <p className="home-cases-text ps-el-185">
                                                    <span className="home-cases-line ps-el-186">Another KIKK Festival yearly revamp: The “Species and Beyond” edition</span>
                                                  </p>
                                                  <p className="link link--caret ps-el-187">
                                                    <span className="link--caret-text ps-el-188">Discover</span>
                                                    <span className="svg svg-caret-right ps-el-189">
                                                      <svg width="7" height="11" className="ps-el-190">
                                                        <use xlink:href="https://dogstudio.co/app/themes/portfolio-2018/static/assets/spritesheet.svg#caret-right" className="ps-el-191">
                                                        </use>
                                                      </svg>
                                                    </span>
                                                  </p>
                                                </div>
                                                <picture className="home-cases-picture ps-el-192">
                                                  <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-450.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-450.png" className="ps-el-193" />
                                                  <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-815.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-815.png" className="ps-el-194" />
                                                  <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-1015.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-1015.png" className="ps-el-195" />
                                                  <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-1440.png" alt="" className="js-lazy loaded ps-el-196" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-1440.png" data-was-processed="true" />
                                                </picture>
                                              </div>
                                            </div>
                                            <div className="home-cases-scene home-cases-scene--the-kennedy-center ps-el-197">
                                              <h3 className="u-visually-hidden ps-el-198">The Kennedy Center</h3>
                                              <div className="inner ps-el-199">
                                                <a href="https://dogstudio.co/cases/the-kennedy-center/" className="home-cases-link ps-el-200">
                                                  <span className="u-visually-hidden ps-el-201">The Kennedy Center</span>
                                                </a>
                                                <div className="home-cases-content ps-el-202">
                                                  <p className="home-cases-headline ps-el-203">Design</p>
                                                  <p className="home-cases-name ps-el-204">The Kennedy Center</p>
                                                  <p className="home-cases-text ps-el-205">
                                                    <span className="home-cases-line ps-el-206">Building an immersive website</span>
                                                    <span className="home-cases-line ps-el-207">
                                                      to celebrate the memory of the</span>
                                                      <span className="home-cases-line ps-el-208">
                                                        unforgettable John F. Kennedy</span>
                                                      </p>
                                                      <p className="link link--caret ps-el-209">
                                                        <span className="link--caret-text ps-el-210">Discover</span>
                                                        <span className="svg svg-caret-right ps-el-211">
                                                          <svg width="7" height="11" className="ps-el-212">
                                                            <use xlink:href="https://dogstudio.co/app/themes/portfolio-2018/static/assets/spritesheet.svg#caret-right" className="ps-el-213">
                                                            </use>
                                                          </svg>
                                                        </span>
                                                      </p>
                                                    </div>
                                                    <picture className="home-cases-picture ps-el-214">
                                                      <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-450.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-450.png" className="ps-el-215" />
                                                      <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-815.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-815.png" className="ps-el-216" />
                                                      <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-1015.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-1015.png" className="ps-el-217" />
                                                      <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-1440.png" alt="" className="js-lazy loaded ps-el-218" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-1440.png" data-was-processed="true" />
                                                    </picture>
                                                  </div>
                                                </div>
                                                <div className="home-cases-scene home-cases-scene--orw ps-el-219">
                                                  <h3 className="u-visually-hidden ps-el-220">Royal Opera Of Wallonia</h3>
                                                  <div className="inner ps-el-221">
                                                    <a href="https://dogstudio.co/cases/royal-opera-of-wallonia/" className="home-cases-link ps-el-222">
                                                      <span className="u-visually-hidden ps-el-223">Royal Opera Of Wallonia</span>
                                                    </a>
                                                    <div className="home-cases-content ps-el-224">
                                                      <p className="home-cases-headline ps-el-225">Design</p>
                                                      <p className="home-cases-name ps-el-226">Royal Opera Of Wallonia</p>
                                                      <p className="home-cases-text ps-el-227">
                                                        <span className="home-cases-line ps-el-228">Imagining and designing an oniric</span>
                                                        <span className="home-cases-line ps-el-229">
                                                          universe to promote the upcoming</span>
                                                          <span className="home-cases-line ps-el-230">
                                                            season of a renown Belgian opera house</span>
                                                          </p>
                                                          <p className="link link--caret ps-el-231">
                                                            <span className="link--caret-text ps-el-232">Discover</span>
                                                            <span className="svg svg-caret-right ps-el-233">
                                                              <svg width="7" height="11" className="ps-el-234">
                                                                <use xlink:href="https://dogstudio.co/app/themes/portfolio-2018/static/assets/spritesheet.svg#caret-right" className="ps-el-235">
                                                                </use>
                                                              </svg>
                                                            </span>
                                                          </p>
                                                        </div>
                                                        <picture className="home-cases-picture ps-el-236">
                                                          <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-450.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-450.png" className="ps-el-237" />
                                                          <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-815.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-815.png" className="ps-el-238" />
                                                          <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-1015.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-1015.png" className="ps-el-239" />
                                                          <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-1440.png" alt="" className="js-lazy loaded ps-el-240" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-1440.png" data-was-processed="true" />
                                                        </picture>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </section>
                                                <section className="home-about js-in-view in-view ps-el-241">
                                                  <h2 className="u-visually-hidden ps-el-242">We're crafting emotional experiences aimed at improving results</h2>
                                                  <picture className="home-about-background js-in-view appear-fade in-view ps-el-243">
                                                    <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/about-xxs.png" media="(max-width: 450px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/about-xxs.png" className="ps-el-244" />
                                                    <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/about-m.png" media="(max-width: 815px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/about-m.png" className="ps-el-245" />
                                                    <source data-srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/about-l.png" media="(max-width: 1030px)" srcset="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/about-l.png" className="ps-el-246" />
                                                    <img data-src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/about-xl.png" className="js-lazy loaded ps-el-247" alt="" src="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/home/about-xl.png" data-was-processed="true" />
                                                  </picture>
                                                  <div className="center ps-el-248">
                                                    <header className="home-about-header js-in-view in-view ps-el-249">
                                                      <p className="home-about-headline appear-fade-up ps-el-250">This is how we do it</p>
                                                      <p className="home-about-title fx-parent ps-el-251">
                                                        <span className="fx-word ps-el-252">
                                                          <span className="fx-letter fx-letter--1 ps-el-253">W</span>
                                                          <span className="fx-letter fx-letter--2 ps-el-254">e</span>
                                                          <span className="fx-letter fx-letter--3 ps-el-255">'</span>
                                                          <span className="fx-letter fx-letter--4 ps-el-256">r</span>
                                                          <span className="fx-letter fx-letter--5 ps-el-257">e</span>
                                                        </span>
                                                        <span className="fx-word ps-el-258">
                                                          <span className="fx-letter fx-letter--6 ps-el-259">c</span>
                                                          <span className="fx-letter fx-letter--7 ps-el-260">r</span>
                                                          <span className="fx-letter fx-letter--8 ps-el-261">a</span>
                                                          <span className="fx-letter fx-letter--9 ps-el-262">f</span>
                                                          <span className="fx-letter fx-letter--10 ps-el-263">t</span>
                                                          <span className="fx-letter fx-letter--11 ps-el-264">i</span>
                                                          <span className="fx-letter fx-letter--12 ps-el-265">n</span>
                                                          <span className="fx-letter fx-letter--13 ps-el-266">g</span>
                                                        </span>
                                                        <br className="ps-el-267" />
                                                        <span className="fx-word ps-el-268">
                                                          <span className="fx-letter fx-letter--14 ps-el-269">e</span>
                                                          <span className="fx-letter fx-letter--15 ps-el-270">m</span>
                                                          <span className="fx-letter fx-letter--16 ps-el-271">o</span>
                                                          <span className="fx-letter fx-letter--17 ps-el-272">t</span>
                                                          <span className="fx-letter fx-letter--18 ps-el-273">i</span>
                                                          <span className="fx-letter fx-letter--19 ps-el-274">o</span>
                                                          <span className="fx-letter fx-letter--20 ps-el-275">n</span>
                                                          <span className="fx-letter fx-letter--21 ps-el-276">a</span>
                                                          <span className="fx-letter fx-letter--22 ps-el-277">l</span>
                                                        </span>
                                                        <br className="ps-el-278" />
                                                        <span className="fx-word ps-el-279">
                                                          <span className="fx-letter fx-letter--23 ps-el-280">e</span>
                                                          <span className="fx-letter fx-letter--24 ps-el-281">x</span>
                                                          <span className="fx-letter fx-letter--25 ps-el-282">p</span>
                                                          <span className="fx-letter fx-letter--26 ps-el-283">e</span>
                                                          <span className="fx-letter fx-letter--27 ps-el-284">r</span>
                                                          <span className="fx-letter fx-letter--28 ps-el-285">i</span>
                                                          <span className="fx-letter fx-letter--29 ps-el-286">e</span>
                                                          <span className="fx-letter fx-letter--30 ps-el-287">n</span>
                                                          <span className="fx-letter fx-letter--31 ps-el-288">c</span>
                                                          <span className="fx-letter fx-letter--32 ps-el-289">e</span>
                                                          <span className="fx-letter fx-letter--33 ps-el-290">s</span>
                                                        </span>
                                                        <span className="fx-word ps-el-291">
                                                          <span className="fx-letter fx-letter--34 ps-el-292">a</span>
                                                          <span className="fx-letter fx-letter--35 ps-el-293">i</span>
                                                          <span className="fx-letter fx-letter--36 ps-el-294">m</span>
                                                          <span className="fx-letter fx-letter--37 ps-el-295">e</span>
                                                          <span className="fx-letter fx-letter--38 ps-el-296">d</span>
                                                        </span>
                                                        <br className="ps-el-297" />
                                                        <span className="fx-word ps-el-298">
                                                          <span className="fx-letter fx-letter--39 ps-el-299">a</span>
                                                          <span className="fx-letter fx-letter--40 ps-el-300">t</span>
                                                        </span>
                                                        <span className="fx-word ps-el-301">
                                                          <span className="fx-letter fx-letter--41 ps-el-302">i</span>
                                                          <span className="fx-letter fx-letter--42 ps-el-303">m</span>
                                                          <span className="fx-letter fx-letter--43 ps-el-304">p</span>
                                                          <span className="fx-letter fx-letter--44 ps-el-305">r</span>
                                                          <span className="fx-letter fx-letter--45 ps-el-306">o</span>
                                                          <span className="fx-letter fx-letter--46 ps-el-307">v</span>
                                                          <span className="fx-letter fx-letter--47 ps-el-308">i</span>
                                                          <span className="fx-letter fx-letter--48 ps-el-309">n</span>
                                                          <span className="fx-letter fx-letter--49 ps-el-310">g</span>
                                                        </span>
                                                        <br className="ps-el-311" />
                                                        <span className="fx-word ps-el-312">
                                                          <span className="fx-letter fx-letter--50 ps-el-313">r</span>
                                                          <span className="fx-letter fx-letter--51 ps-el-314">e</span>
                                                          <span className="fx-letter fx-letter--52 ps-el-315">s</span>
                                                          <span className="fx-letter fx-letter--53 ps-el-316">u</span>
                                                          <span className="fx-letter fx-letter--54 ps-el-317">l</span>
                                                          <span className="fx-letter fx-letter--55 ps-el-318">t</span>
                                                          <span className="fx-letter fx-letter--56 ps-el-319">s</span>
                                                        </span>
                                                      </p>
                                                    </header>
                                                    <div className="home-about-content js-in-view in-view ps-el-320">
                                                      <div className="line ps-el-321">
                                                        <span className="line-anim ps-el-322">
                                                        </span>
                                                      </div>
                                                      <div className="home-about-text typeset ps-el-323">
                                                        <p className="appear-fade-up appear-delay--3 ps-el-324">Dogstudio is a design &amp; technology firm working globally from our offices based in Belgium and Chicago.<br className="ps-el-325" /> Our strong focus on producing high quality &amp; emotional brandings, digital products and experiences became a signature.</p>
                                                        <p className="appear-fade-up appear-delay--4 ps-el-326">We’re passionate about moving people and solving problems for the likes of Microsoft, The Museum of Science And Industry Of Chicago, The Kennedy Center of Washington, Dragone, Quanta Magazine, and many more.</p>
                                                      </div>
                                                      <a href="https://dogstudio.co/values/" className="home-about-link link link--under ps-el-327" title="Discover our values">
                                                        <span className="link-label ps-el-328">Discover our values</span>
                                                        <span className="link-line ps-el-329">
                                                        </span>
                                                        <span className="link-line--anim ps-el-330">
                                                        </span>
                                                      </a>
                                                    </div>
                                                  </div>
                                                </section>
                                              </main>
    </div>
  );
}

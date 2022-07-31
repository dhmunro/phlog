/**
 * @file PlanetClock class creates an interactive geocentric digital orrery.
 * @author David H. Munro
 * @copyright David H. Munro 2022
 * @license MIT
 *
 * This script depends on ephemeris.js and d3.
 * The required externals are:
 *     d3   from d3
 *     dayOfDate, dateOfDay, directionOf, timeSunAt, eclipticOrientation
 *          from ephemeris.js
 */
/* see https://www.cantab.net/users/davidasher/orrery/zodiac.html
 * for coordinates of constellations of the Zodiac:
 * pisces 28.687 aries 53.417 taurus 90.140 gemini 117.988 cancer 138.038
 * leo 173.851 virgo 217.810 libra 241.047 scorpio+ophiuchus 266.238
 * sagittarius 299.656 capricorn 327.488 aquarius 351.650 pisces
 * Astrological dates (match positions in about year 0):
 *   Aries 20/Mar-19/Apr  Taurus 20/Apr-20/May  Gemini 21/May-20/Jun
 *   Cancer 21/Jun-21/Jul  Leo 22/Jul-22/Aug  Virgo 23/Aug-22/Sep
 *   Libra 23/Sep-22/Oct  Scorpio 23/Oct-21/Nov  Sagittarius 22/Nov-20/Dec
 *   Capricorn 21/Dec-19/Jan  Aquarius 20/Jan-17/Feb  Pisces 18/Feb-19/March
 */


class PlanetClock {
  static #width = 750;  // just a convenient number, svg will scale
  static #height = PlanetClock.#width;
  static #rOuter = PlanetClock.#width * 0.5 - 20;
  static #rInner = PlanetClock.#rOuter * 0.71;

  constructor(d3Parent, initYear=2022) {
    let [width, height] = [PlanetClock.#width, PlanetClock.#height];
    this.svg = d3Parent.append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
      .attr("class", "PlanetClock")
      .attr("viewBox", [-width/2, -height/2, width, height])
      .attr("text-anchor", "middle")
      .attr("font-family", "'Merriweather Sans', sans-serif")
      .attr("font-weight", "bold")
      .attr("font-size", 12)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    let [rInner, rOuter] = [PlanetClock.#rInner, PlanetClock.#rOuter];

    this.disabled = false;  // set true to disable controls

    let initDay = new Date("Jan 1 2000 12:00 GMT");  // J2000 time origin
    initDay.setUTCFullYear(initYear);
    // begin at vernal equinox
    this.dayNow = timeSunAt(1.0, 0.0, dayOfDate(initDay));

    //            jan feb        mar apr may jun jul aug sep oct nov dec
    let nday = [0, 31, 28.256366, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    this.eperiod = 0;
    this.tMonth = nday.map(dt => this.eperiod += dt);
    this.updateMonths();

    // night sky ring
    let nightSky = this.svg.append("g").call(
      g => {
        g.append("circle")
          .style("fill", "#ddd")
          .style("stroke", "none")
          .attr("r", rInner);
        g.append("circle")
          .style("fill", "none")
          .style("stroke", "#000")
          .style("stroke-width", rOuter - rInner)
          .attr("r", 0.5*(rOuter + rInner))
      });

    // Zodiac constellations
    let zodiac = [28.687, 53.417, 90.140, 117.988, 138.038, 173.851,
                  217.810, 241.047, 266.238, 299.656, 327.488, 351.650];
    let zodiacNames = ["Ari", "Tau", "Gem", "Cnc", "Leo", "Vir", "Lib",
                       "Sco", "Sgr", "Cap", "Aqr", "Psc"];
    zodiac = zodiac.map(
      (a, i) => [Math.cos(a*Math.PI/180), Math.sin(a*Math.PI/180), i]);
    zodiacNames = zodiac.map(
      ([x, y], i) => {
        let [u, v] = zodiac[(i + 1) % 12];
        u += x;
        v += y;
        let r = Math.sqrt(u**2 + v**2);
        u /= r;
        v /= r;
        return [u, v, zodiacNames[i]];
      });
    this.zodiac = this.svg.append("g").call(
      g => {
        let rBar = 0.5*(rInner + rOuter);
        g.selectAll("g")
          .data(zodiac)
          .join("g")
          .call(g => g.append("line")
                .attr("stroke", "#575")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5, 5")
                .attr("x1", d => rInner*d[0])
                .attr("y1", d => -rInner*d[1])
                .attr("x2", d => 1.03*rOuter*d[0])
                .attr("y2", d => -1.03*rOuter*d[1]))
        .call(g => g.append("text")
              .style("pointer-events", "none")
              .attr("x", d => rBar*zodiacNames[d[2]][0])
              .attr("y", d => -rBar*zodiacNames[d[2]][1])
              .attr("dy", "0.35em")
              .attr("fill", "#575")
              .text(d => zodiacNames[d[2]][2]));
      });


    // day sky wedge is dynamic element needing updates to transform property
    this.daySky = nightSky.append("g").call(
      g => {
        g.append("path").call(
          p => {
            let pio12 = Math.PI / 12;
            let [cpio12, spio12] = [Math.cos(pio12), Math.sin(pio12)];
            let d3p = d3.path();
            d3p.moveTo(1.005*rOuter*cpio12, -1.005*rOuter*spio12);
            d3p.arc(0., 0., 1.005*rOuter, -pio12, pio12);
            d3p.lineTo(0.995*rInner*cpio12, 0.995*rInner*spio12);
            d3p.arc(0., 0., 0.995*rInner, pio12, -pio12, true);
            d3p.closePath();
            p.style("stroke", "none")
              .style("fill", "#bdf")
              .attr("d", d3p);
          });
        let rcen = 0.5*(rOuter + rInner);
        g.append("text")
          .style("fill", "#94c6ff")
          .style("stroke", "none")
          .style("stroke-width", 1)
          .style("pointer-events", "none")
          .attr("font-size", 20)
          .attr("x", rcen)
          .attr("y", 0)
          .attr("dy", "0.35em")
          .text("evening")
          .attr("transform", "rotate(-12)")
          .clone(true)
          .attr("x", -rcen)
          .text("morning")
          .attr("transform", "rotate(192)");
      });
    this.daySky.attr("transform", "rotate(0)");  // degrees clockwise :(
    this.svg.append("g").call(
      g => {
        // grid tick marks and labels for night sky ring (and atop daySky!)
        let rTick = 0.97 * rInner;
        let rText = 0.90 * rInner;
        let ticks = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]
            .map(t => [Math.cos(t*Math.PI/180.), -Math.sin(t*Math.PI/180.), t]);
        g.selectAll("g")
          .data(ticks)
          .join("g")
          .call(g => g.append("line")
                .style("stroke", "#555")
                .style("stroke-width", 2)
                .attr("x1", d => rTick*d[0])
                .attr("y1", d => rTick*d[1])
                .attr("x2", d => rOuter*d[0])
                .attr("y2", d => rOuter*d[1]))
          .call(g => g.append("text")
                .style("fill", "#000")
                .style("stroke", "none")
                .style("pointer-events", "none")
                .attr("x", d => rText*d[0])
                .attr("y", d => rText*d[1])
                .attr("dy", "0.35em")
                .text(d => `${d[2]}°`));
      });
    this.svg.append("g").call(
      g => {
        // circular grid lines at 0, +-5 degrees, +-9 degrees full scale
        let rcen = 0.5 * (rInner + rOuter);
        let dr5 = 0.5 * (rOuter - rInner) * (5. / 9.);
        g.selectAll("g")
          .data([[-5, rcen-dr5], [0, rcen], [5, rcen+dr5]])
          .join("g")
          .call(g => g.append("circle")
                .style("fill", "none")
                .style("stroke", "#555")
                .style("stroke-width", 2)
                .attr("r", d => d[1]))
          .call(g => g.append("text")
                .attr("x", 0)
                .attr("y", d => -d[1])
                .attr("dy", "0.35em")
                // first draw blodges to blot out grid lines underneath
                .style("fill", "none")
                .style("stroke", "#000")
                .style("stroke-width", 6)
                .style("pointer-events", "none")
                .text(d => `${d[0]}°`)
                .clone(true)
                .attr("y", d => d[1]))
          .call(g => g.append("text")
                .attr("x", 0)
                .attr("y", d => -d[1])
                .attr("dy", "0.35em")
                // draw text on top of blodges
                .style("fill", "#fff")
                .style("stroke", "none")
                .style("pointer-events", "none")
                .text(d => `${d[0]}°`)
                .clone(true)
                .attr("y", d => d[1]));
      });

    // Otherwise callback will not have correct this when triggered.
    let yearSetter = () => this.setYear();
    let sunDragger = (event, d) => this.dragSun(event, d);
    let handToggler = ["mercury", "venus", "mars", "jupiter", "saturn"].map(
      p => (() => this.setHandVisibility(p)));

    // Year indicator
    this.centerGroup = this.svg.append("g").call(
      g => {
        g.append("rect").call(
          r => buttonBox(r, -40, -0.50*rInner - 25.5, 80, 32, yearSetter));
        this.yearText = g.append("text").call(
          t => buttonText(t, 0, -0.50*rInner - 1,
                          dateOfDay(this.dayNow).getUTCFullYear(), 24,
                          yearSetter));
        this.dateText = g.append("text")
          .style("pointer-events", "none")
          .attr("font-size", 16)
          .attr("x", 0)
          .attr("y", -0.5*rInner + 25)
          .text(this.getDateText(this.dayNow));
      });
    this.prevDayYear = [this.dayNow, dateOfDay(this.dayNow).getUTCFullYear()];

    // Moon Button
    this.moonButton = this.svg.append("g").attr("display", "none").call(
      g => {
        let moonToggler = () => this.toggleMoon();
        // let xy0 = -0.5 * width;
        let [x0, y0] = [0, -50];  // [xy0 + 78, xy0 + 60];
        g.append("rect").call(
          r => buttonBox(r, x0 - 68, y0 - 20, 136, 26, moonToggler));
        this.moonText = g.append("text").call(
          t => buttonText(t, x0, y0, "Show Moon", 20, moonToggler));
      });

    // Planet legend
    this.planetHandVisibility = {
      mercury: "hidden", venus: "hidden", mars: "hidden",
      jupiter: "hidden", saturn: "hidden"};
    this.planetColors = {mercury: "#f0f", venus: "#fff", mars: "#f00",
                         jupiter: "#0f0", saturn: "#ff0", earth: "#00f",
                         sun: "#fc0"};
    this.svg.append("g").call(
      g => {
        let xdots = -30;
        let ytop = 0.20 * rInner;
        g.append("rect")
          .attr("x", xdots - 10)
          .attr("y", ytop - 20)
          .attr("height", 130)
          .attr("width", 20)
          .attr("rx", 5)
          .style("fill", "#000")
          .style("stroke", "none");
        g.append("circle")
          .attr("stroke", "none")
          .attr("fill", this.planetColors.sun)
          .attr("cx", xdots)
          .attr("cy", ytop - 5)
          .attr("r", 8);
        g.append("text")
          .style("pointer-events", "none")
          .attr("text-anchor", "start")
          .attr("font-size", 14)
          .attr("x", xdots + 15)
          .attr("y", ytop)
          .text("Sun");
        ["mercury", "venus", "mars", "jupiter", "saturn"].forEach(
          (p, i) => {
            let planet = p[0].toUpperCase() + p.substring(1);
            g.append("circle")
              .attr("stroke", "#0000")
              .attr("stroke-width", 12)
              .attr("fill", this.planetColors[p])
              .attr("cx", xdots)
              .attr("cy", ytop + 15 + 20*i)
              .attr("r", 4)
              .style("cursor", "pointer")
              .on("click", handToggler[i]);
            g.append("text")
              .style("cursor", "pointer")
              .attr("text-anchor", "start")
              .attr("font-size", 14)
              .attr("x", xdots + 15)
              .attr("y", ytop + 20 + 20*i)
              .text(planet)
              .on("click", handToggler[i]);
          });
        g.append("text")
          .style("pointer-events", "none")
          .attr("font-size", 14)
          .attr("x", 0)
          .attr("y", 20)
          .text("Earth");
      });

    // Month dial
    function addMonthDial(svg, months) {
      // months clock dial ring background
      svg.append("g").call(
        g => {
          g.append("circle")
            .style("fill", "none")
            .style("stroke", "#f8f8f8")
            .style("stroke-width", 0.12*rInner)
            .attr("r", 0.75*rInner);
          g.append("circle")
            .style("fill", "none")
            .style("stroke", "#000")
            .style("stroke-width", 2)
            .attr("r", 0.69*rInner);
          g.append("circle")
            .style("fill", "none")
            .style("stroke", "#000")
            .style("stroke-width", 2)
            .attr("r", 0.81*rInner);
        });

      // month labels and radial separators
      return svg.append("g").call(
        g => g.selectAll("g")
          .data(months)
          .join("g")
          .call(g => g.append("line")
                .attr("stroke", "#000")
                .attr("stroke-width", 2)
                .attr("x1", d => 0.69*rInner*d[0][0])
                .attr("y1", d => 0.69*rInner*d[0][1])
                .attr("x2", d => 0.81*rInner*d[0][0])
                .attr("y2", d => 0.81*rInner*d[0][1]))
          .call(g => g.append("text")
                .style("pointer-events", "none")
                .attr("x", d => 0.75*rInner*d[1][0])
                .attr("y", d => 0.75*rInner*d[1][1])
                .attr("dy", "0.35em")
                .attr("fill", "#000")
                .text(d => d[2])));
    }

    // Sun position and clock hand
    function addSunHand(svg, color) {
      return svg.append("g").call(
        g => {
          g.append("line")
            .style("pointer-events", "none")
            .attr("stroke", color)
            .attr("stroke-width", 3)
            .attr("x1", 0.).attr("y1", 0.)
            .attr("x2", rOuter).attr("y2", 0.)
            .clone(true)
            .attr("opacity", 0.4)
            .attr("x1", -rOuter).attr("y1", 0.)
            .attr("x2", -0.81*rInner).attr("y2", 0.)
            .clone(true)
            .attr("x1", -0.69*rInner).attr("y1", 0.)
            .attr("x2", 0.).attr("y2", 0.);
          g.append("circle")
            .attr("stroke", "none")
            .attr("fill", color)
            .attr("cx", 0.5*(rInner+rOuter))
            .attr("cy", 0.)
            .attr("r", 8);
          g.append("rect")
            .style("pointer-events", "all")
            .style("cursor", "pointer")
            .style("fill", "none")
            .style("stroke", "none")
            .attr("x", rInner)
            .attr("y", -(rOuter-rInner)/4)
            .attr("height", (rOuter-rInner)/2)
            .attr("width", rOuter-rInner);
          g.attr("transform", "rotate(0)")  // degrees clockwise
            .call(d3.drag().on("drag", sunDragger))
            .on("touchmove", sunDragger);
        });
    }

    // Optional Moon marker
    this.moonGroup = this.svg.append("g");
    this.moonMarker = null;

    // Planet positions
    this.planetMarkers = new Array(5);
    this.planetHands = new Array(5);
    let planetGroup = this.svg.append("g");
    let rcen = 0.5*(rInner + rOuter);
    let dr = 0.5*(rOuter - rInner);
    ["mercury", "venus", "mars", "jupiter", "saturn"].forEach(
      (p, i) => {
        let [xp, yp, lat] = directionOf(p, this.dayNow);
        let r = rcen + dr * lat * 20./Math.PI;
        this.planetMarkers[i] = planetGroup.append("circle")
          .style("pointer-events", "none")
          .attr("stroke", "none")
          .attr("fill", this.planetColors[p])
          .attr("cx", r*xp)
          .attr("cy", -r*yp)
          .attr("r", 4);
        this.planetHands[i] = planetGroup.append("line")
          .style("pointer-events", "none")
          .attr("visibility", this.planetHandVisibility[p])
          .attr("stroke", this.planetColors[p])
          .attr("stroke-width", 3)
          .attr("x1", 0.)
          .attr("y1", 0.)
          .attr("x2", r*xp)
          .attr("y2", -r*yp);
      });

    // Put month dial on top of planets hands, below sun hand.
    this.monthSel = addMonthDial(this.svg, this.months);
    this.sunHand = addSunHand(this.svg, this.planetColors.sun);

    this.svg.append("circle")  // earth is at center
      .attr("stroke", "none")
      .attr("fill", this.planetColors.earth)
      .attr("r", 4);

    // Animation controls
    this.speeds = [1, 2.5, 5];
    let [lo, med, hi] = this.speeds;
    let arrowr = d3.path();
    arrowr.moveTo(-10, rOuter + 20);
    arrowr.lineTo(-10, rOuter + 80);
    arrowr.lineTo(20, rOuter + 50);
    arrowr.closePath();
    let arrowl = d3.path();
    arrowl.moveTo(10, rOuter + 20);
    arrowl.lineTo(10, rOuter + 80);
    arrowl.lineTo(-20, rOuter + 50);
    arrowl.closePath();
    this.svg.append("path")
      .style("cursor", "pointer")
      .attr("fill", "#fdf8e0")
      .attr("stroke", "#000")
      .attr("stroke-width", 2)
      .attr("d", arrowr)
      .attr("transform", "rotate(-35)")
      .on("mousedown touchstart", (event, d) => this.startAnimation(false, lo))
      .clone(true)
      .attr("transform", "rotate(-45)")
      .on("mousedown touchstart", (event, d) => this.startAnimation(false, med))
      .clone(true)
      .attr("transform", "rotate(-55)")
      .on("mousedown touchstart", (event, d) => this.startAnimation(false, hi))
      .clone(true)
      .attr("d", arrowl)
      .attr("transform", "rotate(35)")
      .on("mousedown touchstart", (event, d) => this.startAnimation(true, lo))
      .clone(true)
      .attr("transform", "rotate(45)")
      .on("mousedown touchstart", (event, d) => this.startAnimation(true, med))
      .clone(true)
      .attr("transform", "rotate(55)")
      .on("mousedown touchstart", (event, d) => this.startAnimation(true, hi));
    this.svg.on("mouseup mouseleave touchend",
                (event, d) => this.stopAnimation());

  }

  turnOnMoon() {
    if (this.moonMarker == null) {
      this.moonMarker = this.moonGroup.append("circle")
        .attr("style", "pointer-events: none;")
        .attr("stroke", "none")
        .attr("fill", "#fff")
        .attr("r", 6);
      this.updateMoon();
    }
  }

  turnOffMoon() {
    if (this.moonMarker != null) {
      this.moonMarker.remove();
      this.moonMarker = null;
    }
  }

  toggleMoon() {
    if (this.disabled || this.elapsed) return;
    if (this.moonMarker == null) {
      this.turnOnMoon();
      this.moonText.text("Hide Moon");
    } else {
      this.turnOffMoon();
      this.moonText.text("Show Moon");
    }
  }

  hasZodiac(yes) {
    if (yes) {
      this.zodiac.attr("display", null);
    } else {
      this.zodiac.attr("display", "none");
    }
  }

  hasMoonButton(yes) {
    if (yes) {
      this.moonButton.attr("display", null);
    } else {
      this.moonButton.attr("display", "none");
    }
    this.turnOffMoon();
  }

  updateMoon() {
    if (this.moonMarker == null) {
      return;
    }
    let [rInner, rOuter] = [PlanetClock.#rInner, PlanetClock.#rOuter];
    let rcen = 0.5*(rInner + rOuter);
    let dr = 0.5*(rOuter - rInner);
    let [xp, yp, lat] = ssSchlyter.moon(this.dayNow);
    let r = rcen + dr * lat * 20./Math.PI;
    this.moonMarker.attr("cx", r*xp).attr("cy", -r*yp);
  }

  dragSun(event, d) {
    if (this.disabled) return;
    let [x, y] = [event.x+1.e-20, event.y];
    let theta = Math.atan2(y, x) * 180. / Math.PI
    this.sunHand.attr("transform", `rotate(${theta})`);
    this.daySky.attr("transform", `rotate(${theta})`);
    this.dayNow = timeSunAt(x, -y, this.dayNow);  // update current day
    this.updatePlanets();
    this.updateMoon();
    this.updateYear();
    this.updateElapsed(false);
    this.dateText.text(this.getDateText(this.dayNow));
  }

  goToDay(day) {
    let [x, y] = directionOf("sun", day);
    let theta = Math.atan2(-y, x) * 180. / Math.PI
    this.sunHand.attr("transform", `rotate(${theta})`);
    this.daySky.attr("transform", `rotate(${theta})`);
    this.dayNow = day;  // update current day
    this.updatePlanets();
    this.updateMoon();
    this.updateYear();
    this.updateElapsed(false);
    this.dateText.text(this.getDateText(this.dayNow));
  }

  animateTo(day, step=3) {  // 3 is slow, 6 fast, 12 very fast
    this.stopAnimation();
    day = parseFloat(day);
    if (isNaN(day)) {
      return;
    }
    step = parseFloat(step);
    if (isNaN(step) || step <= 0) {
      return;
    }
    this.dayStep = step;
    this.dayStop = day;
    // set timer makes callbacks at 60 frames/sec (use d3.interval for slower)
    this.dayTimer = d3.timer(() => this.stepDay());
  }

  startAnimation(backward, step=3) {
    if (this.disabled) return;
    this.animateTo(this.dayNow + (backward? -1.0e7 : 1.0e7), step);
  }

  stopAnimation() {
    if (this.dayTimer) {
      this.dayTimer.stop();
      delete this.dayTimer;
    }
  }

  stepDay() {
    let day = this.dayNow;
    let nextDay;
    if (day <= this.dayStop) {
      nextDay = day + this.dayStep;
      if (nextDay > this.dayStop) {
        this.dayTimer.stop();
        delete this.dayTimer;
        nextDay = this.dayStop;
      }
    } else {
      nextDay = day - this.dayStep;
      if (nextDay < this.dayStop) {
        this.dayTimer.stop();
        delete this.dayTimer;
        nextDay = this.dayStop;
      }
    }
    this.goToDay(nextDay);
  }

  getDateText(day) {
    let date = dateOfDay(day - 0.5);  // month ring set to UTC noon Jan 1
    let month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep",
                 "Oct", "Nov", "Dec"][date.getUTCMonth()];
    return `${month} ${date.getUTCDate()}`;
  }

  setYear() {
    if (this.disabled) return;
    let dateNow = dateOfDay(this.dayNow);
    let yearNow = dateNow.getUTCFullYear();
    let year = parseInt(prompt("Jump to Year:", yearNow.toString()));
    if (!isNaN(year) && year != yearNow) {
      dateNow.setUTCFullYear(year);
      let newDay = dayOfDate(dateNow);
      let [xp, yp] = directionOf("sun", this.dayNow);
      let theta = Math.atan2(-yp, xp) * 180./Math.PI;
      this.dayNow = timeSunAt(xp, yp, newDay);  // update current day
      this.sunHand.attr("transform", `rotate(${theta})`);
      this.daySky.attr("transform", `rotate(${theta})`);
      this.updatePlanets();
      this.updateYear();
      this.updateElapsed(true, true);
    }
  }

  updateYear() {
    let year = dateOfDay(this.dayNow).getUTCFullYear();
    if (this.prevDayYear[1] === year) return;
    this.yearText.text(year);
    this.dateText.text(this.getDateText(this.dayNow));
    this.prevDayYear[1] = year;
    let change = (this.dayNow - this.prevDayYear[0]) / 365.25;
    if (change < -10 || change > 10) {
      // after ten years, update the tAxis for precession of equinoxes
      this.updateMonths();
      this.prevDayYear[0] = this.dayNow;
      let rInner = PlanetClock.#rInner;
      this.monthSel.selectAll("g").nodes().forEach((grp, i) => {
        let [xy, xyc, name] = this.months[i];
        let sel = d3.select(grp);
        sel.select("text")
          .attr("x", 0.75*rInner*xyc[0])
          .attr("y", 0.75*rInner*xyc[1]);
        sel.select("line")
          .attr("x1", d => 0.69*rInner*xy[0])
          .attr("y1", d => 0.69*rInner*xy[1])
          .attr("x2", d => 0.81*rInner*xy[0])
          .attr("y2", d => 0.81*rInner*xy[1]);
      });
    }
  }

  updateMonths() {
    let jan1 = new Date("Jan 1 2000 12:00 GMT");  // J2000 time origin
    jan1.setUTCFullYear(dateOfDay(this.dayNow).getUTCFullYear());
    jan1 = dayOfDate(jan1);
    let xyl = this.tMonth.map(d => directionOf("sun", jan1+d));
    let lon = xyl.map(x => Math.atan2(x[1], x[0]) * 180./Math.PI);
    let moxy = xyl.map(([x, y], i, a) => (i<a.length-1)?
                       [0.5*(x+a[i+1][0]), 0.5*(y+a[i+1][1])] : [0, 1]);
    this.months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(
        (name, i) => {
          let [x0, y0] = xyl[i];  // already a unit vector
          let [xm, ym] = moxy[i];  // need to normalize this
          let rm = Math.sqrt(xm*xm + ym*ym);
          [xm, ym] = [xm/rm, ym/rm];
          // Both y0 and ym are in ecliptic coordinates,
          // which have opposite sign from the SVG y-direction.
          return [[x0, -y0], [xm, -ym], name];
        });
  }

  updatePlanets() {
    let rcen = 0.5*(PlanetClock.#rInner + PlanetClock.#rOuter);
    let dr = 0.5*(PlanetClock.#rOuter - PlanetClock.#rInner);
    ["mercury", "venus", "mars", "jupiter", "saturn"].forEach(
      (p, i) => {
        let [xp, yp, lat] = directionOf(p, this.dayNow);
        let r = rcen + dr * lat * 20./Math.PI;
        this.planetMarkers[i].attr("cx", r*xp).attr("cy", -r*yp)
        this.planetHands[i].attr("x2", r*xp).attr("y2", -r*yp)
          .attr("visibility", this.planetHandVisibility[p]);
      });
    this.slaves.forEach(s => s(this));
  }

  setHandVisibility(planet, on) {
    let planets = ["mercury", "venus", "mars", "jupiter", "saturn"];
    let i = planets.indexOf(planet);
    if (i < 0) {
      return;
    }
    if (typeof on == "undefined") {  // toggle visibility
      on = (this.planetHandVisibility[planet] === "hidden");
    }
    let visibility = on? "visible" : "hidden";
    this.planetHandVisibility[planet] = visibility;
    this.planetHands[i].attr("visibility", visibility);
    this.slaves.forEach(s => s(this));
  }

  addSlave(callback) {
    this.slaves.push(callback);
    callback(this);
  }

  removeSlave(callback) {
    const i = this.slaves.index(callback);
    if (i > -1) {
      this.slaves.splice(i, 1);
    }
  }

  slaves = [];

  addElapsed(updateCallback) {
    if (this.elapsed) {
      this.removeElapsed(true);
    }
    this.hasMoonButton(false);
    let yElapsed = -0.25*PlanetClock.#rInner;
    let resetElapsed = () => this.updateElapsed(true);
    if (this.elapsed0 === undefined) {
      this.elapsed0 = this.dayNow;
    } else if (this.elapsed0 != this.dayNow) {
      this.goToDay(this.elapsed0);
    }
    this.elapsed = this.centerGroup.append("g").call(
      g => {
        g.append("text")
          .style("pointer-events", "none")
          .attr("font-size", 20)
          .attr("x", 0)
          .attr("y", yElapsed)
          .text(`${(this.dayNow - this.elapsed0).toFixed(2)} days`);
        g.append("g").call(
          gg => {
            let date = dateOfDay(this.elapsed0);
            let ymd = `${date.getUTCFullYear()} `;
            ymd += `${this.getDateText(this.elapsed0)} `;
            ymd += `${("0"+date.getUTCHours()).slice(-2)}`;
            ymd += `:${("0"+date.getUTCMinutes()).slice(-2)}`;
            gg.append("text")
              .style("pointer-events", "none")
              .attr("text-anchor", "start")
              .attr("font-size", 16)
              .attr("x", -155)
              .attr("y", yElapsed + 29)
              .text("from " + ymd)
            gg.append("rect").call(
              rect => buttonBox(rect, 110-40, yElapsed + 8, 80, 28,
                                resetElapsed));
            gg.append("text").call(
              t => buttonText(t, 110, yElapsed + 29, "Reset", 20,
                              resetElapsed));
          });
      });
    if (updateCallback) {
      this.elapsedUpdater = updateCallback;
    }
  }

  removeElapsed(fromAdd=false) {
    if (this.elapsed) {
      let day = this.elapsed0;
      this.elapsed.remove();
      delete this.elapsed;
      delete this.elapsedUpdater;
      if (!fromAdd && day !== undefined) {
        this.goToDay(day);
      }
    }
  }

  updateElapsed(reset, fromSetYear=false) {
    if (this.elapsed) {
      if (reset) {
        if (this.disabled) return;
        this.elapsed0 = this.dayNow;
        let date = dateOfDay(this.elapsed0);
        let ymd = `${date.getUTCFullYear()} `;
        ymd += `${this.getDateText(this.elapsed0)} `;
        ymd += `${("0"+date.getUTCHours()).slice(-2)}`;
        ymd += `:${("0"+date.getUTCMinutes()).slice(-2)}`;
        this.elapsed.select("g").select("text").text("from " + ymd);
      }
      this.elapsed.select("text").text(
        `${(this.dayNow - this.elapsed0).toFixed(2)} days`);
      if (this.elapsedUpdater) {
        this.elapsedUpdater(reset, fromSetYear);
      }
    }
  }
}


class OrbitView {
  static #width = 750;
  static #height = OrbitView.#width;

  constructor(d3Parent, clock) {
    let [width, height] = [OrbitView.#width, OrbitView.#height];

    this.svg = d3Parent.append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
      .attr("class", "OrbitView")
      .attr("viewBox", [-width/2, -height/2, width, height])
      .style("display", "block")
      .style("margin", "20px")  // padding does not work for SVG?
      .style("background-color", "#aaa")
      .attr("text-anchor", "middle")
      .attr("font-family", "'Merriweather Sans', sans-serif")
      .attr("font-weight", "bold")
      .attr("font-size", 12)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    this.clock = clock;
    this.updateOrigin = () => this.heliocentric();
    // aphelions: Mars 1.6660 au, Jupiter 5.4570 au, Saturn 10.1238 au
    // zoom factors are a bit more than twice these (plus 1 au for geocentric)
    this.zoomFactor = [3.6, 5.5, 14, 23];
    this.zoomFactor = this.zoomFactor.map(s => 0.01*width/s);
    this.zoomLevel = 0;
    let scale = this.zoomFactor[this.zoomLevel];

    zoomButtons(width, this);
    let gap = 0.01*width;  // matches gap in zoomButtons
    let originCycler = () => this.cycleOrigin();
    this.svg.append("rect").call(
      rect => buttonBox(rect, width/2 - 150 - gap, -height/2 + gap, 150, 28,
                        originCycler));
    this.originText = this.svg.append("text").call(
      t => buttonText(t, width/2 - 82, -height/2 + gap + 21, "heliocentric", 20,
                      originCycler));
    this.currentOrigin = "heliocentric";

    // Crosshairs
    this.svg.append("line")
      .style("pointer-events", "none")
      .attr("stroke", "#888").attr("stroke-width", 1)
      .attr("x1", -width/2).attr("y1", 0).attr("x2", width/2).attr("y2", 0)
      .clone(true)
      .attr("x1", 0).attr("y1", -height/2).attr("x2", 0).attr("y2", height/2)

    /* Warning:
       All paths and (x, y) coordinates are multiplied by 100 here to
       avoid bizarre huge pixellation caused by translate() transform
       in the geocentric view.  While dragging the sun around, the
       OrbitView displays the blurred pixelated drawing, but when you
       stop and click on the OrbitView SVG, it redraws as expected.
       The effect is worse at high magnification, which suggested the
       coordinate scaling might be a solution - some renderer appears
       to be dropping the non-integer part of coordinate values.
     */

    // Planet positions
    this.planetMarkers = new Array(7);
    this.planetHands = new Array(6);
    this.planetOrbits = new Array(6);
    this.planetHands = new Array(6);
    this.planetRadii = new Array(5);
    // Note that translate() happens before scale()
    this.planetGroup = this.svg.append("g")
        .style("pointer-events", "none")
        .attr("transform", `scale(${scale}) translate(0, 0)`);
    this.getOrbit = (p, i, t0) => {
      const period = [87.969257, 224.700799, 686.967971, 4332.820129,
                      10755.698644, 365.256355];  // J2000 sidereal years (days)
      let d3p = d3.path();
      let dt = period[i] * 0.01;
      let t = t0;
      let [x, y] = positionOf(p, t);
      d3p.moveTo(100*x, -100*y);
      for (let j = 1 ; j < 100 ; j += 1) {
        t += dt;
        [x, y] = positionOf(p, t);
        d3p.lineTo(100*x, -100*y);
      }
      d3p.closePath()
      if (i == 0) this.orbitalEpoch = t0;
      return d3p;
    }
    ["mercury", "venus", "mars", "jupiter", "saturn", "earth"].forEach(
      (p, i) => {
        this.planetOrbits[i] = this.planetGroup.append("path")
          .style("stroke", clock.planetColors[p])
          .style("stroke-width", 5/scale)
          .style("fill", "none")
          .attr("opacity", 0.2)
          .attr("d", this.getOrbit(p, i, this.clock.dayNow));
        if (i < 5) {
          this.planetRadii[i] = this.planetGroup.append("line")
            .attr("opacity", 0.2)
            .attr("stroke", clock.planetColors[p])
            .attr("stroke-width", 5/scale)
            .attr("x1", 0).attr("y1", 0);
        }
      }
    );
    this.planetOrbits[5]
      .attr("id", "orbit-view-sun")
      .attr("transform", "rotate(0)");
    this.epicycleCircles = this.planetGroup.append("g");
    let [xe, ye] = positionOf("earth", clock.dayNow);
    ["mercury", "venus", "mars", "jupiter", "saturn"].forEach(
      (p, i) => {
        let [x, y] = positionOf(p, clock.dayNow);
        this.planetMarkers[i] = this.planetGroup.append("circle")
          .attr("stroke", "none")
          .attr("fill", clock.planetColors[p])
          .attr("cx", 100*x).attr("cy", -100*y)
          .attr("r", 4/scale);
        this.planetHands[i] = this.planetGroup.append("line")
          .attr("visibility", clock.planetHandVisibility[p])
          .attr("stroke", clock.planetColors[p])
          .attr("stroke-width", 3/scale)
          .attr("x1", 100*xe).attr("y1", -100*ye)
          .attr("x2", 100*x).attr("y2", -100*y);
        this.planetRadii[i].attr("x2", 100*x).attr("y2", -100*y);
      });
    this.planetHands[5] = this.planetGroup.append("line")  // Earth-Sun line
      .attr("stroke", clock.planetColors.sun)
      .attr("stroke-width", 3/scale)
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", 100*xe).attr("y2", -100*ye);
    this.planetMarkers[5] = this.planetGroup.append("circle")  // Earth
      .attr("stroke", "none")
      .attr("fill", clock.planetColors.earth)
      .attr("cx", 100*xe).attr("cy", -100*ye)
      .attr("r", 4/scale);
    this.planetMarkers[6] = this.planetGroup.append("circle")  // Sun
      .attr("stroke", "none")
      .attr("fill", clock.planetColors.sun)
      .attr("cx", 0).attr("cy", 0)
      .attr("r", 8/scale);

    this.clock.addSlave(() => this.update());
  }

  update() {
    if (this.svg.node().parentElement.style.display == "none") return;
    this.updateOrigin();
    let t0 = this.clock.dayNow;
    let newEpoch = Math.abs(t0 - this.orbitalEpoch) > 200*365.256355;
    let [xe, ye] = positionOf("earth", t0);
    ["mercury", "venus", "mars", "jupiter", "saturn"].forEach(
      (p, i) => {
        let [x, y] = positionOf(p, t0);
        if (newEpoch) {
          this.planetOrbits[i].attr("d", this.getOrbit(p, i, t0));
        }
        this.planetMarkers[i].attr("cx", 100*x).attr("cy", -100*y);
        this.planetHands[i]
          .attr("visibility", this.clock.planetHandVisibility[p])
          .attr("x1", 100*xe).attr("y1", -100*ye)
          .attr("x2", 100*x).attr("y2", -100*y);
        this.planetRadii[i].attr("x2", 100*x).attr("y2", -100*y);
      });
    this.planetHands[5].attr("x2", 100*xe).attr("y2", -100*ye);
    this.planetMarkers[5].attr("cx", 100*xe).attr("cy", -100*ye);
  }

  setOrigin(sys) {
    if (sys == "heliocentric") {
      this.updateOrigin = () => this.heliocentric();
      let scale = this.zoomFactor[this.zoomLevel];
      this.planetGroup.attr("transform", `scale(${scale})`);
      this.planetOrbits[5].attr("transform", "rotate(0)");
      this.planetOrbits[5].style("stroke", this.clock.planetColors.earth);
      [2, 3, 4].forEach(i => {
        this.planetOrbits[i].attr("transform", null);
        this.planetRadii[i].attr("transform", null);
      });
      this.epicycleCircles.selectAll("*").remove();
    } else if (sys == "geocentric") {
      this.updateOrigin = () => this.geocentric();
      this.planetOrbits[5].style("stroke", this.clock.planetColors.sun);
    } else if (sys == "epicycles") {
      this.updateOrigin = () => this.epicycles();
      this.planetOrbits[5].style("stroke", this.clock.planetColors.sun);
      ["mars", "jupiter", "saturn"].forEach(
        p => this.epicycleCircles
          .append(() => this.planetHands[5].clone(true).node())
          .attr("stroke", this.clock.planetColors.sun)
          .attr("opacity", 0.2));
      this.epicycleCircles.selectAll("path")
        .data([2, 3, 4])
        .join("path")
        .attr("fill", "none")
        .attr("stroke", this.clock.planetColors.sun)
        .attr("opacity", 0.2)
        .attr("d", this.planetOrbits[5].attr("d"));
    }
    this.update();
  }

  cycleOrigin() {
    if (this.currentOrigin == "heliocentric") {
      this.currentOrigin = "geocentric";
      this.originText.text("geocentric");
    } else if (this.currentOrigin == "geocentric") {
      this.currentOrigin = "epicycles";
      this.originText.text("epicycles");
    } else if (this.currentOrigin == "epicycles") {
      this.currentOrigin = "heliocentric";
      this.originText.text("heliocentric");
    }
    this.setOrigin(this.currentOrigin);
  }

  activate(on) {
    if (on) this.clock.removeElapsed();
  }

  zoomer(inout) {
    let znow = this.zoomLevel;
    if (inout == 0) {
      if (znow > 2) return;
      znow += 1;
    } else {
      if (znow < 1) return;
      znow -= 1;
    }
    this.zoomLevel = znow;
    let scale = this.zoomFactor[znow];
    this.planetOrbits.forEach(
      orbit => orbit.style("stroke-width", 5/scale));
    this.planetRadii.forEach(
      orbit => orbit.style("stroke-width", 5/scale));
    this.planetHands.forEach(
      hand => hand.attr("stroke-width", 3/scale));
    this.planetMarkers.slice(0,6).forEach(
      hand => hand.attr("r", 4/scale));
    this.planetMarkers[6].attr("r", 8/scale);
    if (this.updateOrigin()) {
      this.planetGroup
        .attr("transform", `scale(${scale})`);
    }
    this.update();
  }

  heliocentric() {
    return true;  // planetGroup transform not set
  }

  geocentric() {
    let scale = this.zoomFactor[this.zoomLevel];
    let [xe, ye] = positionOf("earth", this.clock.dayNow);
    this.planetGroup.attr("transform",
                          `scale(${scale}) translate(${-100*xe}, ${100*ye})`);
    this.planetOrbits[5].attr(
      "transform", `translate(${100*xe}, ${-100*ye}) rotate(180)`);
    return false;  // planetGroup transform set
  }

  epicycles() {
    let scale = this.zoomFactor[this.zoomLevel];
    let [xe, ye] = positionOf("earth", this.clock.dayNow);
    let xyz = ["mars", "jupiter", "saturn"]
        .map(p => positionOf(p, this.clock.dayNow));
    this.planetGroup.attr("transform",
                          `scale(${scale}) translate(${-100*xe}, ${100*ye})`);
    ["mars", "jupiter", "saturn"].forEach((p, i) => {
      this.planetOrbits[i+2].attr(
        "transform", `translate(${100*xe}, ${-100*ye})`)
      this.planetRadii[i+2].attr(
        "transform", `translate(${100*xe}, ${-100*ye})`)
    });
    this.planetOrbits[5].attr(
      "transform", `translate(${100*xe}, ${-100*ye}) rotate(180)`);
    this.epicycleCircles.selectAll("line")
      .data([0, 1, 2])
      .attr("stroke-width", 5/scale)
      .attr("x2", `${100*xe}`).attr("y2", `${-100*ye}`)
      .attr("transform", i =>
            `translate(${100*(xe+xyz[i][0])}, ${-100*(ye+xyz[i][1])})` +
            " rotate(180)");
    this.epicycleCircles.selectAll("path")
      .data([0, 1, 2])
      .attr("stroke-width", 5/scale)
      .attr("transform", i =>
            `translate(${100*(xe+xyz[i][0])}, ${-100*(ye+xyz[i][1])})` +
            " rotate(180)");
    return false;  // planetGroup transform set
  }
}


class EarthYear {
  static #width = 750;
  static #height = EarthYear.#width;

  constructor(d3Parent, clock) {
    let [width, height] = [EarthYear.#width, EarthYear.#height];

    this.svg = d3Parent.append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
      .attr("class", "EarthYear")
      .attr("viewBox", [-width/2, -height/2, width, height])
      .style("display", "block")
      .style("margin", "20px")  // padding does not work for SVG?
      .style("background-color", "#ddd")
      .attr("text-anchor", "middle")
      .attr("font-family", "'Merriweather Sans', sans-serif")
      .attr("font-weight", "bold")
      .attr("font-size", 16)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    this.clock = clock;

    zoomButtons(width, this);
    let gap = 0.01*width;  // matches gap in zoomButtons

    let [left, right, bottom, top] = [-width/2+80, width/2-30,
                                      height/2-60, -height/2+60];

    this.svg.append("clipPath").attr("id", "earth-year-clip")
      .append("rect")
      .attr("x", left).attr("width", right-left)
      .attr("y", top).attr("height", bottom-top);

    this.zoomLevel = 0;  // level 1 is 1-year, level 2 is deviation from mean
    this.x = d3.scaleLinear().range([left, right])
      .domain([-1, 11]);
    this.y = d3.scaleLinear().range([bottom, top])
      .domain([-365, 4015]);
    this.xAxis = d3.axisBottom(this.x)
      .ticks(6).tickSize(10).tickPadding(10).tickSizeOuter(0);
    this.yAxis = d3.axisLeft(this.y)
      .ticks(6).tickSize(10).tickPadding(10).tickSizeOuter(0);

    this.gxAxis = this.svg.append("g").call(this.xAxis)
        .style("color", "#000")
        .attr("transform", `translate(0, ${bottom})`)
        .attr("font-size", 16)
        .attr("stroke-width", 2);
    this.gyAxis = this.svg.append("g").call(this.yAxis)
        .style("color", "#000")
        .attr("transform", `translate(${left}, 0)`)
        .attr("font-size", 16)
        .attr("stroke-width", 2);

    // Axis labels
    this.svg.append("text").attr("x", left-10).attr("y", top-12)
      .attr("pointer-events", "none").text("days");
    this.svg.append("text").attr("x", right).attr("y", bottom+50)
      .attr("pointer-events", "none").text("revs");

    let xgen = d => this.x(d[0]);
    this.lineGenerator = d3.line()
      .x(xgen)
      .y(d => this.y(d[1]))
      .curve(d3.curveNatural);
    // Natural spline has continuous second derivative (C2).
    // Catmull Rom only C1, each interval based on surrounding two only.
    // .curve(d3.curveCatmullRom);
    // Deviation generator produces deviation from mean sun:
    this.deviationGenerator = d3.line()
      .x(xgen)
      .y(d => this.y(d[1] - d[0]*this.yearEstimate))
      .curve(d3.curveNatural);

    this.instructions = this.svg.append("g").call(
      g => {
        g.attr("pointer-events", "none")
          .attr("display", "block");
        g.append("text")
          .attr("text-anchor", "start")
          .attr("fill", "#960")
          .attr("font-size", 20)
          .attr("x", -260)
          .attr("y", -height/2 + 100)
          .text("1. Set start date using planet clock")
          .clone(true)
          .attr("y", -height/2 + 125)
          .text("2. Click Reset to collect 10 years data")
          .clone(true)
          .attr("y", -height/2 + 150)
          .text("3. Adjust period using slider at right")
          .clone(true)
          .attr("y", -height/2 + 175)
          .text("4. Zoom in to make fine adjustments");
      });

    this.yearEstimate = 360;  // Have to start somewhere...
    this.yearText = this.svg.append("text")
      .attr("pointer-events", "none")
      .attr("font-size", 20)
      .attr("y", -height/2 + 30)
      .text(`Period estimate: ${this.yearEstimate.toFixed(3)} days`);
    let yearDragger = (event, d) => this.yearDrag(event, d);
    let yearStarter = (event, d) => this.yearDragStart(event, d);
    let d3p = d3.path();
    let y0 = this.y(10*this.yearEstimate);
    let x0 = width/2 - 25;
    d3p.moveTo(x0-10, y0);
    d3p.lineTo(x0, y0-7);
    d3p.lineTo(x0, y0-17);
    d3p.lineTo(x0+17, y0-17);
    d3p.lineTo(x0+17, y0+17);
    d3p.lineTo(x0, y0+17);
    d3p.lineTo(x0, y0+7);
    // d3p.lineTo(x0-10, y0);
    // d3p.lineTo(x0-30, y0);
    d3p.closePath();
    this.sliderNow = this.slider0 = y0;
    // slider itself goes last in svg to be on top

    let [xr, yr] = [this.x(0), this.y(this.yearEstimate)];
    let [dxr, dyr] = [this.x(1) - xr, this.y(0) - yr];

    this.plot = this.svg.append("g")
        .attr("clip-path", "url(#earth-year-clip)");
    this.yearBoxes = this.plot.append("g")
      .attr("display", "none").call(
        g => g.append("line")
          .style("pointer-events", "none")
          .attr("stroke", "#fdf8e0")  // buttonBox color
          .attr("stroke-width", 2));
    this.updateYearBoxes(true);
    this.lineGroup = this.plot.append("g");
    this.linePath = this.lineGroup.append("path")
      .attr("id", "earth-year-line")
      .style("pointer-events", "none")
      .attr("fill", "none")
      .attr("stroke", this.clock.planetColors.earth)
      .attr("stroke-width", 2);
    this.sunMarker = this.plot.append("circle")
      .attr("display", "none")
      .attr("fill", this.clock.planetColors.sun)
      .attr("stroke", "none")
      .attr("r", 8)
      .attr("cx", this.x(0)).attr("cy", this.y(0));
    this.sunMarker2 = this.sunMarker.clone(true);
    this.sunMarkerPos = [0, 0];

    this.slider = this.svg.append("path")
      .style("pointer-events", "all")
      .style("cursor", "pointer")
      .attr("fill", "#fdf8e0")  // buttonBox color
      .attr("stroke", "#000")
      .attr("stroke-width", 1)
      .attr("d", d3p)
      .call(d3.drag().on("start", yearStarter).on("drag", yearDragger))
      .on("touchstart", yearStarter).on("touchmove", yearDragger);
  }

  computeSun(t0) {
    /* Collect ten years of directions to the Sun.  Begin and end
     * with three points spaced only one day apart to try to capture
     * curvature at ends, then a three day gap, and all the rest 5 day
     * spacing, for a total of 3655 days.  Straight 5 day spacing would
     * make 732 points, but with the two extra points in the first and
     * last intervals, the total comes to 736.
     */
    const atan2 = Math.atan2;
    const twoPI = 2 * Math.PI;
    const nt = 736;
    let time = new Array(nt);
    time[0] = 0;
    time[1] = 1;
    time[2] = 2;
    for (let i=3 ; i<nt-3 ; i+=1) time[i] = 5*(i-2);
    time[nt-3] = 3653;
    time[nt-2] = 3654;
    time[nt-1] = 3655;
    let revs = -1;
    let prev;
    return time.map(t => {
      let [x, y] = directionOf("sun", t0+t);
      let dlon = atan2(y, x) / twoPI;
      if (revs < 0) {
        this.revs0 = prev = dlon;
        revs = 0;
      } else {
        [prev, dlon] = [dlon, dlon-prev];
        if (dlon < 0) dlon += 1;
        revs += dlon;
      }
      return [revs, t];
    });
  }

  updateYearBoxes(noTransition=false) {
    let collapse = this.zoomLevel > 0;
    let offset = (new Array(10)).fill(0);
    offset = offset.map((v, i) => [collapse? 0 : i, i]);
    let [xr, yr] = [this.x(0), this.y(this.yearEstimate)];
    let [dxr, dyr] = [this.x(1) - xr, this.y(0) - yr];
    let y1 = yr + dyr;
    let nboxes = collapse? 1 : 10;
    let trans = noTransition? 0 : 1000;
    if (this.zoomLevel < 2) {
      this.yearBoxes.select("line")
        .maybeTransition(trans)
        .attr("x1", xr-0.1*nboxes*dxr).attr("x2", xr+1.1*nboxes*dxr)
        .attr("y1", y1+0.1*nboxes*dyr).attr("y2", y1-1.1*nboxes*dyr);
      this.yearBoxes.selectAll("rect")
        .data(offset)
        .join(
          enter => enter.append("rect")
            .datum(d => d)
            .attr("fill", "#ddd0")  // background-color, transparent
            .attr("stroke", "#fdf8e0")  // buttonBox color
            .attr("stroke-width", 2)
            .attr("x", xr).attr("width", nboxes*dxr)
            .attr("y", yr-(nboxes-1)*dyr).attr("height", nboxes*dyr)
            .maybeTransition(trans)
            .attr("x", d => xr+d[0]*dxr).attr("width", dxr)
            .attr("y", d => yr-d[0]*dyr).attr("height", dyr),
          update => update
            .maybeTransition(trans)
            .attr("x", d => xr+d[0]*dxr).attr("width", dxr)
            .attr("y", d => yr-d[0]*dyr).attr("height", dyr),
          exit => exit
        );
      if (collapse && !noTransition) {
        this.svg.maybeTransition(trans).on(
          "end",
          () => this.yearBoxes.selectAll("rect").data([0]).join("rect"));
      }
    } else {
      this.yearBoxes.select("line")
        .maybeTransition(trans)
        .attr("x1", xr-0.1*dxr).attr("x2", xr+1.1*dxr)
        .attr("y1", y1).attr("y2", y1);
      this.yearBoxes.selectAll("rect")
        .data([0])
        .join("rect")
        .attr("fill", "none")
        .attr("stroke", "#fdf8e0")  // buttonBox color
        .attr("stroke-width", 2)
        .attr("x", xr).attr("width", dxr)
        .attr("y", y1-dyr).attr("height", 2*dyr)
    }
    return this.yearBoxes;
  }

  updateLinePath(noTransition=false) {
    let collapse = this.zoomLevel > 0;
    if (this.linePath.attr("d")) {
      let [xr, yr] = [this.x(0), this.y(this.yearEstimate)];
      let [dxr, dyr] = [this.x(1) - xr, this.y(0) - yr];
      let trans = noTransition? 0 : 1000;
      if (collapse) {
        if (this.zoomLevel < 2) {
          this.linePath.maybeTransition(trans)
            .attr("d", this.lineGenerator(this.revT));
        } else {
          this.linePath.maybeTransition(trans)
            .attr("d", this.deviationGenerator(this.revT));
          dyr = 0;
        }
        this.lineGroup.selectAll("use")
          .data([1, 2, 3, 4, 5, 6, 7, 8, 9])
          .join(
            enter => enter.append("use")
              .attr("href", "#earth-year-line")
              .attr("x", 0).attr("y", 0)
              .maybeTransition(trans)
              .attr("x", d => -dxr*d).attr("y", d => dyr*d),
            update => update
              .maybeTransition(trans)
              .attr("x", d => -dxr*d).attr("y", d => dyr*d),
            exit => exit.remove()
          );
      } else {
        this.linePath.maybeTransition(trans)
          .attr("d", this.lineGenerator(this.revT));
        this.lineGroup.selectAll("use").maybeTransition(trans)
          .attr("x", 0).attr("y", 0).remove();
      }
    }
  }

  updateSunMarker(noTransition=false) {
    let collapse = this.zoomLevel > 0;
    let t0 = this.clock.elapsed0;
    let t = this.clock.dayNow - t0;
    if (this.revT && t >= 0 && t <= 3655) {
      let trans = noTransition? 0 : 1000;
      let [x, y] = directionOf("sun", t+t0);
      let trueYear = 365.25636;
      let revs = Math.atan2(y, x) / (2*Math.PI);
      revs -= this.revs0;
      if (revs < 0) revs += 1;
      // revs is now fractional part of revs since elapsed0
      let drevs = (revs < 0.5)? 1 : -1;  // for sunMarker2
      let nrevs = Math.floor(t/trueYear + 1.e-9);
      this.sunMarkerPos = [revs + nrevs, t];
      if (collapse) {
        t -= nrevs*this.yearEstimate;
      } else {
        revs += nrevs;
      }
      if (this.zoomLevel < 2) {
        this.sunMarker.maybeTransition(trans)
          .attr("cx", this.x(revs))
          .attr("cy", this.y(t));
        this.sunMarker2.maybeTransition(trans)
          .attr("cx", this.x(revs + drevs))
          .attr("cy", this.y(t + drevs*this.yearEstimate));
      } else {
        this.sunMarker.maybeTransition(trans)
          .attr("cx", this.x(revs))
          .attr("cy", this.y(t - revs*this.yearEstimate));
        this.sunMarker2.maybeTransition(trans)
          .attr("cx", this.x(revs + drevs))
          .attr("cy", this.y(t - revs*this.yearEstimate));
      }
    }
  }

  elapsedUpdate(reset, inhibitReset=false) {
    if (reset) {
      // reset the days vs revs graph
      const t0 = this.clock.elapsed0;
      this.elapsed0 = t0;
      this.zoomLevel = 0;
      this.multiYear(true);
      this.linePath.attr("d", null);
      if (inhibitReset) {
        // Presumably from setting year with year button, start over.
        delete this.revs0;
        delete this.revT;
        delete this.revTRange;
        this.sunMarker.attr("cx", this.x(0)).attr("cy", this.y(0));
        this.sunMarker2.attr("cx", this.x(0)).attr("cy", this.y(0));
        this.sunMarkerPos = [0, 0];
        this.instructions.attr("display", "block");
        this.yearBoxes.attr("display", "none");
        this.sunMarker.attr("display", "none");
      } else {
        this.instructions.attr("display", "none");
        this.yearBoxes.attr("display", "block");
        this.sunMarker.attr("display", "block");
        this.revT = this.computeSun(t0);
        this.revTRange = this.revT.reduce(
          ([dtmin, dtmax], [revs, t]) => {  // note that revT[0] = [0, 0]
            let dt = t - revs*365.25636;  // relative to exact mean sun
            if (dt < dtmin) {
              dtmin = dt;
            } else if (dt > dtmax) {
              dtmax = dt;
            }
            return [dtmin, dtmax];  // dtmax - dtmin = 3.8833
          });
        this.linePath.attr("d", this.lineGenerator(this.revT));
        this.multiYear(true);
      }
    } else if (this.revT) {
      this.updateSunMarker(true);
    }
  }

  activate(on) {
    if (on) {
      let oldElapsed0 = this.clock.elapsed0;
      this.clock.addElapsed((r, ir) => this.elapsedUpdate(r, ir));
      this.clock.elapsed0 = oldElapsed0;
      if (this.elapsed0 != this.clock.elapsed0) {
        this.clock.goToDay(this.clock.elapsed0);
        this.elapsedUpdate(true);
      } else if (this.elapsed0 === undefined) {
        this.elapsedUpdate(true, true);
        this.clock.elapsed0 = this.clock.dayNow;
      }
    }
  }

  zoomer(inout) {
    let level = this.zoomLevel;
    if (inout == 0) {  // Decrease magnification.
      level -= 1;
      if (level < 0) return;
    } else {  // Increase magnification.
      level += 1;
      if (level > 2 || (level > 1 && !this.revTRange)) return;
    }
    this.zoomLevel = level;
    if (level == 0) {
      this.multiYear();
    } else if (level == 1) {
      this.singleYear();
    } else {
      this.hiMag();
    }
  }

  multiYear(noTransition=false) {
    let trans = noTransition? 0 : 1000;
    this.x.domain([-1, 11]);
    this.y.domain([-365, 4015]);
    this.xAxis.scale(this.x);
    this.yAxis.scale(this.y);
    this.gxAxis.maybeTransition(trans).call(this.xAxis);
    this.gyAxis.maybeTransition(trans).call(this.yAxis);
    this.updateLinePath(noTransition);
    this.sunMarker2.attr("display", "none");
    this.updateSunMarker(noTransition);
    this.updateYearBoxes(noTransition);
    let y = this.y(10*this.yearEstimate);
    this.sliderNow = y;
    this.slider.attr("transform", `translate(0, ${y - this.slider0})`);
  }

  singleYear(noTransition=false) {
    let trans = noTransition? 0 : 1000;
    this.x.domain([-0.1, 1.1]);
    this.y.domain([-36.5, 401.5]);
    this.xAxis.scale(this.x);
    this.yAxis.scale(this.y);
    this.gxAxis.maybeTransition(trans).call(this.xAxis);
    this.gyAxis.maybeTransition(trans).call(this.yAxis);
    this.updateLinePath(noTransition);
    this.sunMarker2.attr("display", "block");
    this.updateSunMarker(noTransition);
    this.updateYearBoxes(noTransition);
    let y = this.y(this.yearEstimate);
    this.sliderNow = y;
    this.slider.attr("transform", `translate(0, ${y - this.slider0})`);
  }

  hiMag(noTransition=false) {
    // Adjust yearEstimate to keep slider on scale if necessary.
    if (this.yearEstimate < 364.925) {
      this.yearEstimate = 364.925;
      this.yearText.text(`Period estimate: 364.925 days`);
    } else if (this.yearEstimate > 365.6) {
      this.yearEstimate = 365.6;
      this.yearText.text(`Period estimate: 365.600 days`);
    }
    let trans = noTransition? 0 : 1000;
    this.x.domain([-0.1, 1.1]);
    let dtAvg = 0.5*(this.revTRange[1] + this.revTRange[0]);
    this.y.domain([dtAvg-3.5, dtAvg+3.5]);
    this.xAxis.scale(this.x);
    this.yAxis.scale(this.y);
    this.gxAxis.maybeTransition(trans).call(this.xAxis);
    this.gyAxis.maybeTransition(trans).call(this.yAxis);
    this.updateLinePath(noTransition);
    this.updateSunMarker(noTransition);
    this.updateYearBoxes(noTransition);
    // Place exact year at midpoint of vertical scale.
    let ymid = 0.5*(this.revTRange[0] + this.revTRange[1]);
    let y = this.y(10*(this.yearEstimate - 365.25636) + ymid);
    this.sliderNow = y;
    this.slider.attr("transform", `translate(0, ${y - this.slider0})`);
  }

  yearDrag(event, d) {
    let [x, y] = [event.x+1.e-20, event.y];
    y += this.yDragOffset;
    let factor = (this.zoomLevel > 0)? 1 : 10;
    let days = this.y.invert(y);
    if (this.zoomLevel < 2) {
      if (days < 350*factor) {
        days = 350*factor;
        y = this.y(days);
      } else if (days > 380*factor) {
        days = 380*factor;
        y = this.y(days);
      }
    } else {
      let ymid = 0.5*(this.revTRange[0] + this.revTRange[1]);
      days = 0.1*(days - ymid) + 365.25636;
      if (days < 364.925) {
        days = 364.925;
        y = this.y(10*(this.yearEstimate - 365.25636) + ymid);
      } else if (days > 365.6) {
        days = 365.6;
        y = this.y(10*(this.yearEstimate - 365.25636) + ymid);
      }
    }
    this.sliderNow = y;
    this.yearEstimate = days / factor;
    this.slider.attr("transform", `translate(0, ${y - this.slider0})`);
    this.yearText.text(`Period estimate: ${this.yearEstimate.toFixed(3)} days`);
    this.updateYearBoxes(true);
    this.updateLinePath(true);
    this.updateSunMarker(true);
  }

  yearDragStart(event, d) {
    let [x, y] = [event.x+1.e-20, event.y];
    this.yDragOffset = this.sliderNow - y;
  }

  changeYearEstimate(days) {
    this.yearEstimate = days;
    let factor = (this.zoomLevel > 0)? 1 : 10;
    let y = this.y(days * factor);
    this.slider.attr("transform", `translate(0, ${y - this.slider0})`);
    this.yearText.text(`Period estimate: ${this.yearEstimate.toFixed(3)} days`);
    this.updateYearBoxes(true);
    this.updateLinePath(true);
    this.updateSunMarker(true);
  }
}


class MarsYear {
  static #width = 750;
  static #height = MarsYear.#width;

  constructor(d3Parent, clock) {
    let [width, height] = [MarsYear.#width, MarsYear.#height];

    this.svg = d3Parent.append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
      .attr("class", "MarsYear")
      .attr("viewBox", [-width/2, -height/2, width, height])
      .style("display", "block")
      .style("margin", "20px")  // padding does not work for SVG?
      .style("background-color", "#ddd")
      .attr("text-anchor", "middle")
      .attr("font-family", "'Merriweather Sans', sans-serif")
      .attr("font-weight", "bold")
      .attr("font-size", 16)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    this.clock = clock;

    zoomButtons(width, this);
    let gap = 0.01*width;  // matches gap in zoomButtons

    let [left, right, bottom, top] = [-width/2+80, width/2-30,
                                      height/2-60, -height/2+60];

    this.svg.append("clipPath").attr("id", "mars-year-clip")
      .append("rect")
      .attr("x", left).attr("width", right-left)
      .attr("y", top).attr("height", bottom-top);

    this.zoomLevel = 0;  // level 1 is 1-year, level 2 is deviation from mean
    this.x = d3.scaleLinear().range([left, right])
      .domain([-1, 11]);
    this.y = d3.scaleLinear().range([bottom, top])
      .domain([-730, 8030]);
    this.xAxis = d3.axisBottom(this.x)
      .ticks(6).tickSize(10).tickPadding(10).tickSizeOuter(0);
    this.yAxis = d3.axisLeft(this.y)
      .ticks(6).tickSize(10).tickPadding(10).tickSizeOuter(0);

    this.gxAxis = this.svg.append("g").call(this.xAxis)
        .style("color", "#000")
        .attr("transform", `translate(0, ${bottom})`)
        .attr("font-size", 16)
        .attr("stroke-width", 2);
    this.gyAxis = this.svg.append("g").call(this.yAxis)
        .style("color", "#000")
        .attr("transform", `translate(${left}, 0)`)
        .attr("font-size", 16)
        .attr("stroke-width", 2);

    // Axis labels
    this.svg.append("text").attr("x", left-10).attr("y", top-12)
      .attr("pointer-events", "none").text("days");
    this.svg.append("text").attr("x", right).attr("y", bottom+50)
      .attr("pointer-events", "none").text("revs");

    let xgen = d => this.x(d[0]);
    let dgen = d => d[2];
    this.lineGenerator = d3.line()
      .x(xgen)
      .y(d => this.y(d[1]))
      .defined(dgen)
      .curve(d3.curveNatural);
    // Natural spline has continuous second derivative (C2).
    // Catmull Rom only C1, each interval based on surrounding two only.
    // .curve(d3.curveCatmullRom);
    // Deviation generator produces deviation from mean sun:
    this.deviationGenerator = d3.line()
      .x(xgen)
      .y(d => this.y(d[1] - d[0]*this.yearEstimate))
      .defined(dgen)
      .curve(d3.curveNatural);

    this.instructions = this.svg.append("g").call(
      g => {
        g.attr("pointer-events", "none")
          .attr("display", "block");
        g.append("text")
          .attr("text-anchor", "start")
          .attr("fill", "#960")
          .attr("font-size", 20)
          .attr("x", -260)
          .attr("y", -height/2 + 100)
          .text("1. Set start date using planet clock")
          .clone(true)
          .attr("y", -height/2 + 125)
          .text("2. Reset to collect 20 years opposition data")
          .clone(true)
          .attr("y", -height/2 + 150)
          .text("3. Adjust period using slider at right")
          .clone(true)
          .attr("y", -height/2 + 175)
          .text("4. Zoom in to make fine adjustments");
      });

    this.yearEstimate = 680;  // Have to start somewhere...
    this.yearText = this.svg.append("text")
      .attr("pointer-events", "none")
      .attr("font-size", 20)
      .attr("y", -height/2 + 30)
      .text(`Period estimate: ${this.yearEstimate.toFixed(3)} days`);
    let yearDragger = (event, d) => this.yearDrag(event, d);
    let yearStarter = (event, d) => this.yearDragStart(event, d);
    let d3p = d3.path();
    let y0 = this.y(10*this.yearEstimate);
    let x0 = width/2 - 25;
    d3p.moveTo(x0-10, y0);
    d3p.lineTo(x0, y0-7);
    d3p.lineTo(x0, y0-17);
    d3p.lineTo(x0+17, y0-17);
    d3p.lineTo(x0+17, y0+17);
    d3p.lineTo(x0, y0+17);
    d3p.lineTo(x0, y0+7);
    // d3p.lineTo(x0-10, y0);
    // d3p.lineTo(x0-30, y0);
    d3p.closePath();
    this.sliderNow = this.slider0 = y0;
    // slider itself goes last in svg to be on top

    let [xr, yr] = [this.x(0), this.y(this.yearEstimate)];
    let [dxr, dyr] = [this.x(1) - xr, this.y(0) - yr];

    this.plot = this.svg.append("g")
        .attr("clip-path", "url(#mars-year-clip)");
    this.yearBoxes = this.plot.append("g")
      .attr("display", "none").call(
        g => g.append("line")
          .style("pointer-events", "none")
          .attr("stroke", "#fdf8e0")  // buttonBox color
          .attr("stroke-width", 2));
    this.lineGroup = this.plot.append("g");
    this.linePath = this.lineGroup.append("path")
      .attr("id", "mars-year-line")
      .style("pointer-events", "none")
      .attr("opacity", 0.2)
      .attr("fill", "none")
      .attr("stroke", this.clock.planetColors.mars)
      .attr("stroke-width", 5);
    this.marsMarker = this.plot.append("circle")
      .attr("display", "none")
      .attr("opacity", 0.3)
      .attr("fill", this.clock.planetColors.mars)
      .attr("stroke", "none")
      .attr("r", 5)
      .attr("cx", this.x(0)).attr("cy", this.y(0));
    this.marsMarkerPos = [0, 0];
    this.oppoMarkers = this.plot.append("g");

    this.slider = this.svg.append("path")
      .style("pointer-events", "all")
      .style("cursor", "pointer")
      .attr("fill", "#fdf8e0")  // buttonBox color
      .attr("stroke", "#000")
      .attr("stroke-width", 1)
      .attr("d", d3p)
      .call(d3.drag().on("start", yearStarter).on("drag", yearDragger))
      .on("touchstart", yearStarter).on("touchmove", yearDragger);
  }

  computeMars(t0) {
    /* Collect twenty years of directions to Mars.  Begin and end
     * with three points spaced two days apart to try to capture
     * curvature at ends, then a six day gap, and all the rest ten day
     * spacing, for a total of 7310 days.  Straight 10 day spacing would
     * make 732 points, but with the two extra points in the first and
     * last intervals, the total comes to 736.
     */
    const atan2 = Math.atan2;
    const twoPI = 2 * Math.PI;
    const nt = 736;
    let time = new Array(nt);
    time[0] = 0;
    time[1] = 2;
    time[2] = 4;
    for (let i=3 ; i<nt-3 ; i+=1) time[i] = 10*(i-2);
    time[nt-3] = 7306;
    time[nt-2] = 7308;
    time[nt-1] = 7310;
    this.oppositions = new OppositionDetector("mars", t0);
    let revs = -1;
    let prev;
    return time.map(t => {
      if (t > 0) this.oppositions.next(t0+t);
      let revs = this.oppositions.range[1][0];
      let defined = this.oppositions.range[1][5] > -0.965925826289  // cos(15)
      return [revs, t, defined];
    });
  }

  updateYearBoxes(noTransition=false) {
    let collapse = this.zoomLevel > 0;
    let offset = (new Array(10)).fill(0);
    offset = offset.map((v, i) => [collapse? 0 : i, i]);
    let [xr, yr] = [this.x(0), this.y(this.yearEstimate)];
    let [dxr, dyr] = [this.x(1) - xr, this.y(0) - yr];
    const t0 = this.clock.elapsed0;
    let x1 = this.x(this.oppositions.found[0][0]);
    let y1 = this.y(this.oppositions.found[0][1] - t0);
    // let y1 = yr + dyr;
    let nboxes = collapse? 1 : 10;
    let trans = noTransition? 0 : 1000;
    if (this.zoomLevel < 2) {
      this.yearBoxes.select("line")
        .maybeTransition(trans)
        .attr("x1", x1-2*nboxes*dxr).attr("x2", x1+2*nboxes*dxr)
        .attr("y1", y1+2*nboxes*dyr).attr("y2", y1-2*nboxes*dyr);
      this.yearBoxes.selectAll("rect")
        .data(offset)
        .join(
          enter => enter.append("rect")
            .datum(d => d)
            .attr("fill", "#ddd0")  // background-color, transparent
            .attr("stroke", "#fdf8e0")  // buttonBox color
            .attr("stroke-width", 2)
            .attr("x", xr).attr("width", nboxes*dxr)
            .attr("y", yr-(nboxes-1)*dyr).attr("height", nboxes*dyr)
            .maybeTransition(trans)
            .attr("x", d => xr+d[0]*dxr).attr("width", dxr)
            .attr("y", d => yr-d[0]*dyr).attr("height", dyr),
          update => update
            .maybeTransition(trans)
            .attr("x", d => xr+d[0]*dxr).attr("width", dxr)
            .attr("y", d => yr-d[0]*dyr).attr("height", dyr),
          exit => exit
        );
      if (collapse && !noTransition) {
        this.svg.maybeTransition(trans).on(
          "end",
          () => this.yearBoxes.selectAll("rect").data([0]).join("rect"));
      }
    } else {
      this.yearBoxes.select("line")
        .maybeTransition(trans)
        .attr("x1", x1-2*dxr).attr("x2", x1+2*dxr)
        .attr("y1", this.y(0)).attr("y2", this.y(0));
      this.yearBoxes.selectAll("rect")
        .data([0])
        .join("rect")
        .attr("fill", "none")
        .attr("stroke", "#fdf8e0")  // buttonBox color
        .attr("stroke-width", 2)
        .attr("x", xr).attr("width", dxr)
        .attr("y", y1-dyr).attr("height", 2*dyr)
    }
    return this.yearBoxes;
  }

  updateLinePath(noTransition=false) {
    let trans = noTransition? 0 : 1000;
    let collapse = this.zoomLevel > 0;
    if (this.linePath.attr("d")) {
      let [xr, yr] = [this.x(0), this.y(this.yearEstimate)];
      let [dxr, dyr] = [this.x(1) - xr, this.y(0) - yr];
      if (collapse) {
        if (this.zoomLevel < 2) {
          this.linePath.maybeTransition(trans)
            .attr("opacity", 0.05)
            .attr("d", this.lineGenerator(this.revT));
        } else {
          this.linePath.maybeTransition(trans).attr("opacity", 0);
          dyr = 0;
        }
        this.lineGroup.selectAll("use")
          .data([1, 2, 3, 4, 5, 6, 7, 8, 9])
          .join(
            enter => enter.append("use")
              .attr("href", "#mars-year-line")
              .attr("x", 0).attr("y", 0)
              .maybeTransition(trans)
              .attr("x", d => -dxr*d).attr("y", d => dyr*d),
            update => update
              .maybeTransition(trans)
              .attr("x", d => -dxr*d).attr("y", d => dyr*d),
            exit => exit.remove()
          );
      } else {
        this.linePath.maybeTransition(trans)
          .attr("opacity", 0.2)
          .attr("d", this.lineGenerator(this.revT));
        this.lineGroup.selectAll("use").maybeTransition(trans)
          .attr("x", 0).attr("y", 0).remove();
      }
      if (this.zoomLevel < 1) {
        this.oppoMarkers.selectAll("path").remove();
        this.oppoMarkers.selectAll("circle")
          .data(this.OppoRevT())
          .join("circle")
          .attr("fill", this.clock.planetColors.mars)
          .attr("stroke", "none")
          .attr("r", 4)
          .maybeTransition(trans)
          .attr("cx", d => this.x(d[0]))
          .attr("cy", d => this.y(d[1]));
      } else {
        let rt = this.OppoRevT();
        let iwrap = rt.findIndex((v, i, a) => i > 0 && v[0] < a[i-1][0]);
        // zoomLevel 2 is deviation from line t = t0 + (r-r0)*yearEstimate
        let dtdrev = (this.zoomLevel < 2)? 0 : this.yearEstimate;
        let dt = (this.zoomLevel < 2)? 0 : rt[0][1]-rt[0][0]*this.yearEstimate;
        let mask = (this.zoomLevel < 2)? 1 : 0;
        rt = rt.map(([r, t], i) => (i < iwrap)? [r, t - dt - dtdrev*r] :
                    [r + 1, t - dt - dtdrev*(r+1) + this.yearEstimate]);
        let fromMulti = this.oppoMarkers.selectAll("circle").size() < 15;
        if (fromMulti) {
          this.oppoMarkers.selectAll("circle")
            .data(rt.concat(rt))
            .join("circle")
            .attr("fill", this.clock.planetColors.mars)
            .attr("stroke", "none")
            .attr("r", 4)
            .attr("cx", d => this.x(d[0]))
            .attr("cy", d => this.y(d[1]));
        }
        this.oppoMarkers.selectAll("circle")
          .data(rt.concat(rt.map(([r, t]) => [r - 1,
                                              t - mask*this.yearEstimate])))
          .join("circle")
          .attr("fill", this.clock.planetColors.mars)
          .attr("stroke", "none")
          .attr("r", 4)
          .maybeTransition(trans)
          .attr("cx", d => this.x(d[0]))
          .attr("cy", d => this.y(d[1]));
        let d3line = d3.line()
            .x(d => this.x(d[0]))
            .y(d => this.y(d[1]))
            .curve(d3.curveNatural);
        this.oppoMarkers.selectAll("path")
          .data([rt, rt.map(([r, t]) => [r - 1, t - mask*this.yearEstimate])])
          .join("path")
          .attr("display", (noTransition || !fromMulti)? "block" : "none")
          .attr("fill", "none")
          .attr("stroke", this.clock.planetColors.mars)
          .attr("stroke-width", 2)
          .maybeTransition(fromMulti? 0 : trans)
          .attr("d", d => d3line(d));
        if (fromMulti && !noTransition) {
          this.oppoMarkers.transition(trans).on(
            "end", () => this.oppoMarkers.selectAll("path").attr("display",
                                                                 "block"));
        }
      }
    }
  }

  updateMarsMarker(noTransition=false) {
    let collapse = this.zoomLevel > 0;
    let t0 = this.clock.elapsed0;
    let t = this.clock.dayNow - t0;
    if (this.revT) {
      if (t < 0) {
        this.clock.goToDay(t0);
        t = 0;
      } else if (t > 7310) {
        this.clock.goToDay(t0 + 7310);
        t = 7310;
      }
      let trans = noTransition? 0 : 1000;
      let prev = this.prevUpdate;
      if (prev === undefined) {
        prev = this.oppositions.range[(t>3000)? 1 : 0];
      }
      let current = this.oppositions.collectDay(t0+t);
      current.unshift(prev[0]);
      current[0] += this.oppositions.deltaRevs(prev, current);
      this.prevUpdate = current;
      let revs = current[0];
      if (collapse) {
        let nrevs = Math.floor(revs)
        revs -= nrevs;
        t -= nrevs * this.yearEstimate;
      }
      this.marsMarker.maybeTransition(trans)
        .attr("cx", this.x(revs))
        .attr("cy", this.y(t));
    } else {
      delete this.prevUpdate;
    }
  }

  elapsedUpdate(reset, inhibitReset=false) {
    if (reset) {
      // reset the days vs revs graph
      const t0 = this.clock.elapsed0;
      this.elapsed0 = t0;
      this.zoomLevel = 0;
      this.ecliptic = eclipticOrientation(t0);
      if (this.oppositions) this.multiYear(true);
      this.linePath.attr("d", null);
      if (inhibitReset) {
        // Presumably from setting year with year button, start over.
        delete this.prevUpdate;
        delete this.revT;
        delete this.oppoRange;
        this.marsMarker.attr("cx", this.x(0)).attr("cy", this.y(0));
        this.marsMarkerPos = [0, 0];
        this.oppoMarkers.selectAll("circle").remove();
        this.oppoMarkers.selectAll("path").remove();
        this.instructions.attr("display", "block");
        this.yearBoxes.attr("display", "none");
        this.marsMarker.attr("display", "none");
      } else {
        this.instructions.attr("display", "none");
        this.yearBoxes.attr("display", "block");
        this.marsMarker.attr("display", "block");
        this.oppoMarkers.selectAll("circle").remove();
        this.oppoMarkers.selectAll("path").remove();
        this.revT = this.computeMars(t0);
        let [rev0, tr0] = [0, this.clock.elapsed0]; // this.oppositions.found[0];
        tr0 -= t0;
        this.revT = this.revT.map(([rev, t, d]) => [rev-rev0, t-tr0, d]);
        this.oppoMarkers.selectAll("circle")
          .data(this.OppoRevT())
          .join("circle")
          .attr("fill", this.clock.planetColors.mars)
          .attr("stroke", "none")
          .attr("r", 4)
          .attr("cx", d => this.x(d[0]))
          .attr("cy", d => this.y(d[1]));
        [rev0, tr0] = this.oppositions.found[0];
        this.oppoRange = this.oppositions.found.reduce(
          ([dtmin, dtmax], [revs, t], i) => {
            // t -> t - tr0 - (revs - rev0)*686.97973
            if (i == 1) {
              let tmp =  dtmax - tr0 - (dtmin - rev0)*686.97973;
              dtmin = dtmax = tmp;
            }
            let dt = t - tr0 - (revs - rev0)*686.97973;
            if (dt < dtmin) {
              dtmin = dt;
            } else if (dt > dtmax) {
              dtmax = dt;
            }
            return [dtmin, dtmax];
          });
        this.linePath.attr("d", this.lineGenerator(this.revT));
        this.prevUpdate = this.oppositions.range[0];
        this.updateYearBoxes(true);
        this.updateMarsMarker(true);
      }
    } else if (this.revT) {
      this.updateMarsMarker(true);
    }
  }

  OppoRevT() {
    let collapse = this.zoomLevel > 0;
    let [revs0, t0] = [0, this.clock.elapsed0];  // this.oppositions.found[0];
    return this.oppositions.found.map(
      ([revs, t]) => {
        revs -= revs0;
        t -= t0;
        if (collapse) {
          let nrevs = Math.floor(revs);
          revs -= nrevs;
          t -= nrevs*this.yearEstimate;
        }
        return [revs, t]
      });
  }

  activate(on) {
    if (on) {
      let oldElapsed0 = this.clock.elapsed0;
      this.clock.addElapsed((r, ir) => this.elapsedUpdate(r, ir));
      this.clock.elapsed0 = oldElapsed0;
      if (this.elapsed0 != undefined && this.elapsed0 != this.clock.elapsed0) {
        this.clock.goToDay(this.elapsed0);
        this.clock.updateElapsed(true);
      } else if (oldElapsed0 === undefined) {
        this.clock.elapsed0 = this.clock.dayNow;
      }
    }
  }

  zoomer(inout) {
    if (!this.oppositions) return;
    let level = this.zoomLevel;
    if (inout == 0) {  // Decrease magnification.
      level -= 1;
      if (level < 0) return;
    } else {  // Increase magnification.
      level += 1;
      if (level > 2 || (level > 1 && !this.oppoRange)) return;
    }
    this.zoomLevel = level;
    if (level == 0) {
      this.multiYear();
    } else if (level == 1) {
      this.singleYear();
    } else {
      this.hiMag();
    }
  }

  changeYearEstimate(newEstimate) {
    this.yearEstimate = newEstimate;
    let level = this.zoomLevel;
    if (level == 0) {
      this.multiYear(true);
    } else if (level == 1) {
      this.singleYear(true);
    } else {
      this.hiMag(true);
    }
  }

  multiYear(noTransition=false) {
    let trans = noTransition? 0 : 1000;
    this.x.domain([-1, 11]);
    this.y.domain([-730, 8030]);
    this.xAxis.scale(this.x);
    this.yAxis.scale(this.y);
    this.gxAxis.maybeTransition(trans).call(this.xAxis);
    this.gyAxis.maybeTransition(trans).call(this.yAxis);
    this.marsMarker.attr("display", "block");
    this.setSlider(this.y(10*this.yearEstimate), noTransition);
  }

  singleYear(noTransition=false) {
    let trans = noTransition? 0 : 1000;
    this.x.domain([-0.1, 1.1]);
    this.y.domain([-73, 803]);
    this.xAxis.scale(this.x);
    this.yAxis.scale(this.y);
    this.gxAxis.maybeTransition(trans).call(this.xAxis);
    this.gyAxis.maybeTransition(trans).call(this.yAxis);
    this.marsMarker.attr("display", "block");
    this.setSlider(this.y(this.yearEstimate), noTransition);
  }

  hiMag(noTransition=false) {
    let trans = noTransition? 0 : 1000;
    this.x.domain([-0.1, 1.1]);
    let dtAvg = 0.5*(this.oppoRange[1] + this.oppoRange[0]);
    this.y.domain([dtAvg-30, dtAvg+30]);
    this.xAxis.scale(this.x);
    this.yAxis.scale(this.y);
    this.gxAxis.maybeTransition(trans).call(this.xAxis);
    this.gyAxis.maybeTransition(trans).call(this.yAxis);
    this.marsMarker.attr("display", "none");
    this.setSlider(this.y(10*(this.yearEstimate - 686.97973) + dtAvg),
                   noTransition);
  }

  yearDrag(event, d) {
    let [x, y] = [event.x+1.e-20, event.y];
    y += this.yDragOffset;
    this.setSlider(y, true);
  }

  setSlider(y, noTransition=false) {
    let days = this.y.invert(y);
    let factor = (this.zoomLevel > 0)? 1 : 10;
    // Adjust yearEstimate to keep slider on scale if necessary.
    if (this.zoomLevel < 2) {
      if (days < 650*factor) {
        days = 650*factor;
        y = this.y(days);
      } else if (days > 730*factor) {
        days = 730*factor;
        y = this.y(days);
      }
    } else {
      // Place exact year at midpoint of vertical scale.
      let dtAvg = 0.5*(this.oppoRange[0] + this.oppoRange[1]);
      // Factor of 0.1 because full scale of y axis is dtAvg+-30 days,
      // while full scale of slider is only yearEstimate+-3 days.
      days = 0.1*(days - dtAvg) + 686.97973;
      if (days < 684) {
        days = 684;
        y = this.y(10*(684 - 686.97973) + dtAvg);
      } else if (days > 690) {
        days = 690;
        y = this.y(10*(690 - 686.97973) + dtAvg);
      }
    }
    this.sliderNow = y;
    this.yearEstimate = days / factor;
    this.slider.attr("transform", `translate(0, ${y - this.slider0})`);
    this.yearText.text(`Period estimate: ${this.yearEstimate.toFixed(3)} days`);
    this.updateYearBoxes(noTransition);
    this.updateLinePath(noTransition);
    if (this.zoomLevel < 2) this.updateMarsMarker(noTransition);
  }

  yearDragStart(event, d) {
    let [x, y] = [event.x+1.e-20, event.y];
    this.yDragOffset = this.sliderNow - y;
  }
}


class SurveyOrbits {
  static #width = 750;
  static #height = SurveyOrbits.#width;

  constructor(d3Parent, clock, mars, earth) {
    let [width, height] = [SurveyOrbits.#width, SurveyOrbits.#height];

    this.svg = d3Parent.append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
      .attr("class", "SurveyOrbits")
      .attr("viewBox", [-width/2, -height/2, width, height])
      .style("display", "block")
      .style("margin", "20px")  // padding does not work for SVG?
      .style("background-color", "#bbb")
      .attr("text-anchor", "middle")
      .attr("font-family", "'Merriweather Sans', sans-serif")
      .attr("font-weight", "bold")
      .attr("font-size", 12)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    this.clock = clock;
    this.mars = mars;
    this.earth = earth;

    // Scale is 1 AU = width/3.6, same as zoomLevel=0 in OrbitView.
    const AU = width / 3.6;
    this.AU = AU;
    const sin15 = Math.sin(Math.PI / 12);
    // J2000 periods
    this.earthYear = 365.256355;
    this.marsYear = 686.97973;  // but will use this.mars.yearEstimate

    // Crosshairs
    this.svg.append("line")
      .style("pointer-events", "none")
      .attr("stroke", "#888").attr("stroke-width", 1)
      .attr("x1", -width/2).attr("y1", 0).attr("x2", width/2).attr("y2", 0)
      .clone(true)
      .attr("x1", 0).attr("y1", -height/2).attr("x2", 0).attr("y2", height/2)
    // Approximate too-close-to-sun circle
    this.svg.append("circle")
      .attr("stroke", "none")
      .attr("fill", "#bdf")
      .attr("opacity", 0.3)
      .attr("cx", 0).attr("cy", 0)
      .attr("r", sin15*AU);

    // Each state has its own group
    this.stateGroup = new Array(4);
    this.stateGroup[0] = this.svg.append("g").attr("display", "none").call(
      g =>  {
        g.append("text")
          .attr("pointer-events", "none")
          .attr("fill", "#960")
          .attr("font-size", 20)
          .attr("y", -height/2 + 100)
          .text("Not ready to survey orbits.")
          .clone(true)
          .attr("y", -height/2 + 130)
          .text("Return to Mars Period tab and collect data.");
      });
    this.stateGroup[1] = this.svg.append("g").attr("display", "none").call(
      g =>  {
        g.append("g").append("text")  // g allows selectChildren in selectOppo
          .attr("pointer-events", "none")
          .attr("fill", "#960")
          .attr("font-size", 20)
          .attr("y", -height/2 + 25)
          .text("Select reference Mars opposition");
      });
    this.stateGroup[2] = this.svg.append("g").attr("display", "none").call(
      g =>  {
        let gg = g.append("g");  // g allows selectChildren in selectOppo
        this.state2Text1 = gg.append("text")
          .attr("pointer-events", "none")
          .attr("fill", "#960")
          .attr("font-size", 20)
          .attr("y", -height/2 + 25)
          .text("Survey points on Earth's orbit...")
        this.state2Text2 = this.state2Text1.clone(true)
          .attr("y", height/2 - 25)
          .text("by stepping Mars periods->")
        this.yearText = gg.append("text")
          .attr("text-anchor", "end")
          .attr("font-size", 20)
          .attr("fill", "#fdf8e0")
          .attr("x", width/2 - 5)
          .attr("y", -height/2 + 76)
          .text("686.980")
      });
    // marsLines is set of lines from Earth to Mars
    // sunLines is set of lines from Earth to Sun
    //   only displayed in state=2, or state=3 for newly added Earth points
    // referenceGroup is line from Sun to Mars and Mars point at iOppo
    // earthGroup is set of points on Earth orbit
    // marsGroup is set of points on Mars orbit
    this.marsLines = this.stateGroup[2].append("g")
      .attr("pointer-events", "none");
    this.sunLines = this.marsLines.clone(true);
    this.referenceGroup = this.sunLines.clone(true);
    this.earthGroup = this.referenceGroup.clone(true);
    this.marsGroup = this.earthGroup.clone(true);
    this.referenceGroup.call(
      g => {
        g.append("line")  // x2, y2 filled in in findEarth
          .attr("stroke", "#000")
          .attr("stroke-width", 4)
        g.append("circle")  // cx, cy filled in in findEarth
          .style("cursor", null)
          .attr("fill", clock.planetColors.mars)
          .attr("stroke", "none")
          .attr("r", 5);
      });
    this.stateGroup[3] = this.svg.append("g").attr("display", "none");

    this.state = 0;
    this.iOppo = -1;  // index of selected opposition

    // Sun marker goes on top of everything else
    this.svg.append("circle")
      .attr("stroke", "none")
      .attr("fill", clock.planetColors.sun)
      .attr("cx", 0).attr("cy", 0)
      .attr("r", 8);

    // Next and Prev buttons
    this.nextButton = this.svg.append("g").attr("display", "none").call(
      g => {
        buttonBox(g.append("rect"), width/2 - 79, -height/2 + 5, 75, 28,
                  () => this.nextState());
        buttonText(g.append("text"), width/2 - 42, -height/2 + 26, "Next", 20,
                   () => this.nextState());
      });
    this.prevButton = this.svg.append("g").attr("display", "none").call(
      g => {
        buttonBox(g.append("rect"), -width/2 + 5, -height/2 + 5, 75, 28,
                  () => this.prevState());
        buttonText(g.append("text"), -width/2 + 42, -height/2 + 26, "Prev", 20,
                   () => this.prevState());
      });

    // + and - buttons
    this.plusMars = this.svg.append("g").attr("display", "none").call(
      g => {
        g.append("text")
          .attr("pointer-events", "none")
          .attr("text-anchor", "end")
          .attr("fill", "#960")
          .attr("font-size", 20)
          .attr("x", width/2 - 15)
          .attr("y", height/2 - 10)
          .text("step Mars period");
        buttonBox(g.append("rect"), 285, height/2 - 60, 50, 28,
                  () => this.stepMars(1));
        buttonText(g.append("text"), 309, height/2 - 38, "+M", 20,
                  () => this.stepMars(1) );
        buttonBox(g.append("rect"), 200, height/2 - 60, 50, 28,
                  () => this.stepMars(-1));
        buttonText(g.append("text"), 226, height/2 - 38, "-M", 20,
                   () => this.stepMars(-1));
      });
    this.plusEarth = this.svg.append("g").attr("display", "none").call(
      g => {
        g.append("text")
          .attr("pointer-events", "none")
          .attr("text-anchor", "start")
          .attr("fill", "#960")
          .attr("font-size", 20)
          .attr("x", -width/2 + 15)
          .attr("y", height/2 - 10)
          .text("step Earth period");
        buttonBox(g.append("rect"), -335, height/2 - 60, 50, 28,
                  () => this.stepEarth(-1));
        buttonText(g.append("text"), -309, height/2 - 38, "-E", 20,
                  () => this.stepEarth(-1));
        buttonBox(g.append("rect"), -250, height/2 - 60, 50, 28,
                  () => this.stepEarth(1));
        buttonText(g.append("text"), -226, height/2 - 38, "+E", 20,
                   () => this.stepEarth(1));
        this.stdDevText = g.append("text")
          .attr("pointer-events", "none")
          .attr("text-anchor", "end")
          .attr("fill", "#fdf8e0")
          .attr("font-size", 20)
          .attr("x", width/2 - 5)
          .attr("y", -height/2 + 50);
        this.maxDevText = this.stdDevText.clone(true)
          .attr("y", -height/2 + 25);
      });

    let d3p = d3.path();
    let y0 = 0;
    let x0 = width/2 - 22;
    d3p.moveTo(x0-10, y0);
    d3p.lineTo(x0, y0-7);
    d3p.lineTo(x0, y0-17);
    d3p.lineTo(x0+17, y0-17);
    d3p.lineTo(x0+17, y0+17);
    d3p.lineTo(x0, y0+17);
    d3p.lineTo(x0, y0+7);
    d3p.closePath();
    this.sliderNow = this.slider0 = y0;
    let yearDragger = (event, d) => this.yearDrag(event, d);
    let yearStarter = (event, d) => this.yearDragStart(event, d);
    this.slider = this.svg.append("path")
      .style("pointer-events", "all")
      .style("cursor", "pointer")
      .attr("display", "none")
      .attr("fill", "#fdf8e0")  // buttonBox color
      .attr("stroke", "#000")
      .attr("stroke-width", 1)
      .attr("d", d3p)
      .call(d3.drag().on("start", yearStarter).on("drag", yearDragger))
      .on("touchstart", yearStarter).on("touchmove", yearDragger);

    this.notReady();
  }

  stateGroupActivate(...states) {
    // <ES6: let states = Array.from(arguments);
    this.stateGroup.forEach(g => g.attr("display", "none"));
    states.forEach(i => this.stateGroup[i].attr("display", "block"));
  }

  yearDragStart(event, d) {
    let [x, y] = [event.x+1.e-20, event.y];
    this.yDragOffset = this.sliderNow - y;
  }

  yearDrag(event, d) {
    let [x, y] = [event.x+1.e-20, event.y];
    y += this.yDragOffset;
    this.yearSliderSet(y);
    let state = this.state;
    this.findEarth();
    if (state > 2) this.findMars();
  }

  yearSliderSet(y) {
    let [bottom, top]  = this.yearDomain;
    let clamped = y < top;
    if (clamped) {
      y = top;
    } else {
      clamped = y > bottom;
      if (clamped) y = bottom;
    }
    let days = this.yearScale(y);
    this.sliderNow = y;
    this.marsEstimate = days;
    this.slider.attr("transform", `translate(0, ${y - this.slider0})`);
    this.yearText.text(this.marsEstimate.toFixed(3));
    return clamped;
  }

  yearDomain = [SurveyOrbits.#height/2 - 100, -SurveyOrbits.#height/2 + 100];
  yearScale = d3.scaleLinear().domain(this.yearDomain)
    .range([686.97973 - 0.5, 686.97973 + 0.5]);

  notReady() {
    if (!this.mars.oppositions ||
        !this.mars.oppositions.found.length) {
      this.nextButton.attr("display", "none");
      this.prevButton.attr("display", "none");
      this.plusMars.attr("display", "none");
      this.plusEarth.attr("display", "none");
      this.slider.attr("display", "none");
      this.stateGroupActivate(0);
      this.state = 0;
      return true;
    } else if (this.oppositionsFound !== this.mars.oppositions.found) {
      // Oppositions changed since last activation, reset state.
      this.oppositionsFound = this.mars.oppositions.found;
      this.marsEstimate = this.mars.yearEstimate;
      this.ecliptic = this.mars.ecliptic;
      this.forceClockInRange();
      this.iOppo = -1;
      this.selectOppo();
      return false;
    } else if (this.marsEstimate !== this.mars.yearEstimate) {
      // Oppositions unchanged but Mars year changed since last activation.
      this.marsEstimate = this.mars.yearEstimate;
      this.forceClockInRange();
      if (this.state >= 2) {
        this.yearSliderSet(this.yearScale.invert(this.marsEstimate));
        this.findEarth();  //reset earth positions
      }
      return false;
    } else {
      // Oppositions unchanged since last activation.
      this.forceClockInRange();
      if (this.state == 0) this.selectOppo();
      return false;
    }
  }

  forceClockInRange() {
    if (this.clock.dayNow < this.mars.elapsed0) {
      this.clock.goToDay(this.mars.elapsed0);
    } else if (this.clock.dayNow > this.mars.elapsed0 + 7310) {
      this.clock.goToDay(this.mars.elapsed0 + 7310);
    }
  }

  nextState() {
    if (this.state == 1) {
      // Initialize slider
      if (this.yearSliderSet(this.yearScale.invert(this.marsEstimate))) {
        // mars.yearEstimate was clamped to better value
      }
      this.findEarth();
    } else if (this.state == 2) {
      this.findMars();
    }
  }

  prevState(g, callback) {
    if (this.state == 2) {
      this.selectOppo();
    } else if (this.state == 3) {
      if (this.ijNow && this.ijNow[0]) this.ijNow[0] = 0;
      this.findEarth();
    }
  }

  selectOppo() {
    this.plusMars.attr("display", "none");
    this.plusEarth.attr("display", "none");
    this.slider.attr("display", "none");
    this.prevButton.attr("display", "none");
    this.referenceGroup.attr("display", "none");
    this.stateGroupActivate(1);
    this.state = 1;

    if (this.iOppo < 0) {
      this.nextButton.attr("display", "none");
    } else {
      this.nextButton.attr("display", "block");
      return;
    }

    const AU = this.AU;
    const xyzm = this.oppositionsFound.map((o, i) => [o[2], i]);
    const dxyz = this.oppositionsFound.map((o, i) => [o.slice(1,3), i]);
    this.stateGroup[1].selectChildren("line")
      .data(xyzm)
      .join("line")
      .attr("opacity", 0.25)
      .attr("stroke", this.clock.planetColors.mars)
      .attr("stroke-width", 4)
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", ([d, i]) => 2*d[0]*AU)
      .attr("y2", ([d, i]) => -2*d[1]*AU);
    this.stateGroup[1].selectChildren("circle")
      .data(xyzm)
      .join("circle")
      .style("cursor", "pointer")
      .attr("fill", "#fdf8e0")
      .attr("stroke", "#000")
      .attr("stroke-width", 2)
      .attr("r", 15)
      .attr("cx", ([d, i]) => d[0]*AU)
      .attr("cy", ([d, i]) => -d[1]*AU)
      .on("click", this.selector.bind(this));
    this.stateGroup[1].selectChildren("text")
      .data(dxyz)
      .join("text")
      .attr("pointer-events", "none")
      .attr("fill", "#fdf8e0")
      .attr("font-size", 16)
      .attr("x", ([d, i]) => d[1][0]*AU)
      .attr("y", ([d, i]) => -d[1][1]*AU+30)
      .text(([d, i]) => dateOfDay(d[0]).getUTCFullYear());
  }

  selector(event, [d, i]) {
    if (this.iOppo == i) return;
    const AU = this.AU;
    let sg1 = this.stateGroup[1];
    let elements;
    let change = this.iOppo >= 0;
    if (change) {
      elements = ["line", "circle"].map(
        type => d3.select(sg1.selectChildren(type).nodes()[this.iOppo]));
      elements[0]
        .attr("opacity", 0.25)
        .attr("stroke", this.clock.planetColors.mars)
        .attr("x2", ([d, j]) => 2*d[0]*AU)
        .attr("y2", ([d, j]) => -2*d[1]*AU);
      elements[1]
        .style("cursor", "pointer")
        .attr("fill", "#fdf8e0")
        .attr("stroke", "#000")
        .attr("r", 15);
    }
    this.iOppo = i;
    elements = ["line", "circle"].map(
      type => d3.select(sg1.selectChildren(type).nodes()[i]));
    elements[0]
      .attr("opacity", null)
      .attr("stroke", "#000")
      .attr("x2", ([d, j]) => d[0]*AU)
      .attr("y2", ([d, j]) => -d[1]*AU);
    elements[1]
      .style("cursor", null)
      .attr("fill", this.clock.planetColors.mars)
      .attr("stroke", "none")
      .attr("r", 5);
    if (d) this.clock.animateTo(this.oppositionsFound[i][1], 20);
    if (!change) this.nextButton.attr("display", "block");
  }

  findEarth() {
    this.plusMars.attr("display", "block");
    this.plusEarth.attr("display", "none");
    this.slider.attr("display", "block");
    this.prevButton.attr("display", "block");
    this.nextButton.attr("display", "none");
    this.stateGroupActivate(2);
    this.state2Text1.text("Survey points on Earth's orbit...");
    this.state2Text2.text("by stepping Mars periods->");
    this.state = 2;

    let iOppo = this.iOppo;
    if (iOppo < 0) return;  // should never return here?

    this.nextButton.attr("display", "block");

    const AU = this.AU;
    const [xm, ym, zm] = this.oppositionsFound[iOppo][2];

    let imin, imax;  // Earth year index, relative to reference oppo
    [imin, this.orbitDirections] = this.orbitPoints(iOppo);
    [imin, imax] = [-imin, this.orbitDirections.length - 1 - imin];
    let jmax = Math.floor(7310/this.marsEstimate);  // Mars year index
    let jmin = -jmax;
    this.jRef = jmax;
    this.iRef = -imin;
    // Somewhat confusingly, the number of points on Earth's orbit
    // is the number of Mars year steps (and vice-versa) because stepping
    // a Mars year changes the position of Earth (and vice-versa).
    let xye = new Array(jmax - jmin + 1);  // always 21 Mars year steps
    let xym = new Array(imax - imin + 1);  // 40 or 41 Earth year steps
    this.xyEarth = xye;
    this.xyMars = xym;
    xym[-imin] = [xm, ym, 0, 0, 0, zm];  // -imin is iOppo
    this.getEarth(-imin);
    // Above zm is true Mars coordinate from ephemeris, but that is not fair.
    // In fact, only (xm, ym) can be assumed here and we need to compute zm
    // from the observed ecliptic latitudes.  Now that we have a set of
    // Earth points, we can recompute Mars zm coordinate fairly:
    xym[-imin] = this.getMars(-imin);
    // This can move (xm, ym) slightly - should use slightly different
    // algorithm for finding this first zm than the others.  Here we
    // simply replace original (xm, ym) to guarantee first Earth points
    // are perfectly consistent:
    xym[-imin][0] = xm;
    xym[-imin][1] = ym;
    // Defer calculation of xym other than xym[iRef] until findMars.

    // orbitDirections is indexed by Earth year, provide alternate
    // orbitTranspose indexed by Mars year.
    this.orbitTranspose = Array.from(new Array(jmax - jmin + 1), () => []);
    this.orbitDirections.forEach(
      list => list.forEach(p => this.orbitTranspose[p[1]-jmin].push(p)));

    // marsLines is set of lines from Earth to Mars
    // sunLines is set of lines from Earth to Sun
    //   only displayed in state=2, or state=3 for newly added Earth points
    // referenceGroup is line from Sun to Mars and Mars point at iOppo
    // earthGroup is set of points on Earth orbit
    // marsGroup is set of points on Mars orbit
    // this.marsLines = this.stateGroup[2].append("g")
    //   .attr("pointer-events", "none");
    // this.sunLines = this.marsLines.clone(true);
    // this.earthGroup = this.referenceGroup.clone(true);
    // this.marsGroup = this.earthGroup.clone(true);

    this.referenceGroup.select("line")
      .attr("x2", xm*AU).attr("y2", -ym*AU);
    this.referenceGroup.select("circle")
      .attr("cx", xm*AU).attr("cy", -ym*AU);
    this.referenceGroup.attr("display", "block");
    this.marsGroup.attr("display", "none");

    if (this.ijNow === undefined || this.ijNow[0]<imin || this.ijNow[0]>imax
        || this.ijNow[1]<jmin || this.ijNow[1]>jmax) {
      this.ijNow = [0, 0];
    }
    let [i, j] = this.ijNow;

    this.updateDrawing();
    let t0 = this.oppositionsFound[this.iOppo][1];
    this.clock.goToDay(t0 + i*this.earthYear + j*this.marsEstimate);
  }

  getEarth(i) {
    let [x, y] = this.xyMars[i];
    let [cnti, msnti] = this.ecliptic;
    this.orbitDirections[i].forEach(
      ([ii, jj, [mex, mey], [sex, sey], cross, flag]) => {
        let j = jj + this.jRef;
        let xye = this.xyEarth;
        // xyEarth is array of [xe, ye, mvec, svec, flag, idef, jdef]
        // (xe, ye) point on Earth orbit
        // mvec, svec unit vectors toward Mars and Sun, respectively
        // flag -1 within 15 deg of conjuction, 1 within 6 deg of opposition
        // idef, jdef Earth (i) and Mars (j) year steps where this defined
        if (flag == 0 && xye[j] === undefined) {
          let r = (mey*x - mex*y) / cross;
          let [xe, ye] = [r*sex, r*sey];
          // Make small correction for slow change in ecliptic orientation.
          // This is fair, because in any epoch the true ecliptic for that
          // epoch would be measured.  The (x, y) coordinates in plane change
          // by only a negligible second order amount, so we can use them
          // to estimate the z-coordinate of Earth in this epoch.
          // Without this correction, the angular errors in the postions of
          // Mars and Earth become quite noticeable a few centuries from
          // J2000.
          let ze = msnti*xe + cnti*ye;
          xye[j] = [xe, ye, [mex, mey], [sex, sey], flag, ii, jj, ze];
        }
      });
  }

  stepMars(pm) {
    const [i, jOld] = this.ijNow;
    const j = jOld + pm;
    const od = this.orbitDirections[i + this.iRef];
    if (j < od[0][1] || j > od[od.length-1][1]) return;
    this.ijNow = [i, j];
    this.updateDrawing();
    let t0 = this.oppositionsFound[this.iOppo][1];
    this.clock.animateTo(t0 + i*this.earthYear + j*this.marsEstimate, 20);
  }

  findMars() {
    this.plusMars.attr("display", "block");
    this.plusEarth.attr("display", "block");
    this.slider.attr("display", "block");
    this.prevButton.attr("display", "block");
    this.nextButton.attr("display", "none");
    // state 3 reuses elements from state 2
    this.state2Text1.text("Survey points on Mars's orbit...");
    this.state2Text2.text("<-by stepping Earth periods");
    this.stateGroupActivate(2);
    this.state = 3;

    // Get points on Mars orbit:
    // First, step to each point on Mars orbit, starting in direction
    // where there are most points.
    // At each step, use all points on Earth orbit known at previous step
    // to determine new point on Mars orbit, then define any new points
    // on Earth orbit.
    // Note that xyEarth records the i at which each point was defined.
    let iRef = this.iRef;
    let xym = this.xyMars;
    let [imin, imax] = [-iRef, this.orbitDirections.length-1 - iRef];
    let step = (-imin > imax)? -1 : 1;
    // i increasing --> 1 on first pass, imax on last pass, so imax steps
    // i decreasing --> -1 on first pass, imin on last pass, so -imin steps
    // n0 must be 1 greater than the actual number of passes
    let n0 = (step < 0)? 1 - imin : 1 + imax;
    let i = -imin;
    while (n0 -= 1) {
      i += step;
      xym[i] = this.getMars(i);
      this.getEarth(i);
    }
    // Now step in opposite direction.
    n0 = (step > 0)? 1 - imin : 1 + imax;
    i = -imin;
    while (n0 -= 1) {
      i -= step;
      xym[i] = this.getMars(i);
      this.getEarth(i);
    }
    // Compute standard deviation of Mars position fits (in deg).
    let [chi2, ntot] = xym.reduce(
      ([c0, n0], [xm, ym, c, n]) => [c0+c, n0+n], [0, 0]);
    let stdev = Math.sqrt(chi2 / ntot) * 180/Math.PI;
    this.stdDevText.text(`${stdev.toFixed(3)}°`);
    // Largest angular deviation of Mars also interesting:
    let jRef = this.jRef;
    let xye = this.xyEarth;
    let maxDev = Math.sqrt(
      this.orbitDirections.map(
        odi => odi.map(
          ([ii, jj, [mx, my, [ex, ey, ez]], s, cross, flag]) => {
            let [xe, ye, a, b, c, d, e, ze] = xye[jj + jRef];
            let [x, y, chi2, n, idef, z] = xym[ii + iRef];
            x -= xe;
            y -= ye;
            z -= ze;
            let r2 = x**2 + y**2 + z**2;
            [x, y, z] = [y*ez - z*ey, z*ex - x*ez, x*ey - y*ex];
            return (x**2 + y**2 + z**2)/r2;
          }).reduce((prev, cur) => (cur > prev)? cur : prev))
        .reduce((prev, cur) => (cur > prev)? cur : prev)) * 180/Math.PI;
    this.maxDevText.text(`${maxDev.toFixed(3)}°`);

    this.updateDrawing();
  }

  getMars(i) {
    let lines = [];
    let odi = this.orbitDirections[i];
    odi.forEach(
      ([ii, jj, [mx, my, [mex, mey, mez]], s, cross, flag]) => {
        let j = jj + this.jRef;
        let xye = this.xyEarth;
        if (flag >= 0 && xye[j] !== undefined) {
          let [x, y] = xye[j];
          lines.push([x, y, xye[j][7], mex, mey, mez]);
        }
      });
    let [xm, ym, zm, chi2] = nearestPointTo(lines, true);
    // xyMars is [xm, ym, chi2, n, idef, zm]
    // (xm, ym) point on Mars orbit
    // chi2, n total square distance from sight lines, number of lines
    // idef Earth years displaced from reference opposition for (xm, ym)
    // zm ecliptic z coordinate of Mars
    return [xm, ym, chi2, lines.length, i - this.iRef, zm];
  }

  stepEarth(pm) {
    const [iOld, j] = this.ijNow;
    const i = iOld + pm;
    const od = this.orbitTranspose[j + this.jRef];
    if (i < od[0][0] || i > od[od.length-1][0]) return;
    this.ijNow = [i, j];
    this.updateDrawing();
    let t0 = this.oppositionsFound[this.iOppo][1];
    this.clock.animateTo(t0 + i*this.earthYear + j*this.marsEstimate, 20);
  }

  earthType(xyeDatum) {
    // 0 --> out of range for this Mars point iNow
    // 1 --> in range but not usable because Mars near conjunction or opposition
    // 2 --> Earth point newly defined by this Mars point
    // 3 --> Earth point used to define this Mars point
    const [iDef, jDef] = xyeDatum.slice(5);
    const iNow = this.ijNow[0];
    const odi = this.orbitDirections[iNow + this.iRef];
    let [jMin, jMax] = [odi[0][1], odi[odi.length-1][1]];
    if (jDef < jMin || jDef > jMax) return 0;
    const flag = odi[jDef-jMin][5];  // flag at ijNow
    if (flag < 0 || (iNow == 0 && flag > 0)) return 1;
    if (iNow == iDef) return 2;
    return 3;
  }

  updateDrawing() {
    let AU = this.AU;
    let [iNow, jNow] = this.ijNow;
    let [iRef, jRef] = [this.iRef, this.jRef];
    let xye = this.xyEarth;  // [xe, ye, mvec, svec, flag, idef, jdef]
    let xym = this.xyMars;  // [xm, ym, chi2, n, idef, zm]
    let planetColors = this.clock.planetColors;
    if (this.state == 3) {
      // Mars point at iNow highlighted, others dim.
      this.marsGroup.attr("display", "block");
      this.marsGroup.selectAll("circle")
        .data(xym.filter((d, i) => i != iRef))  // iRef drawn in referenceGroup
        .join(enter => enter.append("circle")
                .attr("opacity", d => (d[4] == iNow)? 1 : 0.16)
                .attr("stroke", "none")
                .attr("fill", planetColors.mars)
                .attr("cx", d => d[0]*AU).attr("cy", d => -d[1]*AU)
                .attr("r", 4),
             update => update
               .attr("opacity", d => (d[4] == iNow)? 1 : 0.16)
               .attr("cx", d => d[0]*AU).attr("cy", d => -d[1]*AU),
              exit => exit.remove());
      // Earth points newly used or defined here are highlighted, others dim.
      this.earthGroup.selectAll("circle")
        .data(xye)
        .join(enter => enter.append("circle")
              .attr("opacity", d => (this.earthType(d) >= 2)? 1 : 0.16)
                .attr("stroke", "none")
                .attr("fill", planetColors.earth)
                .attr("cx", d => d[0]*AU).attr("cy", d => -d[1]*AU)
                .attr("r", 4),
              update => update
                .attr("opacity", d => (this.earthType(d) >= 2)? 1 : 0.16)
                .attr("cx", d => d[0]*AU).attr("cy", d => -d[1]*AU),
              exit => exit.remove());
      // Only draw Sun lines for Earth points newly defined here.
      // However, also want to highlight jNow line, so make everything
      // except the newly defined have zero opacity.
      let esFactor = (d) => (this.earthType(d) == 1)? 1.8*AU : AU;
      this.sunLines.selectAll("line")
        .data(xye.filter(d => this.earthType(d) >= 1))
        .join(enter => enter.append("line")
                .attr("opacity", d => (d[5] == iNow)? 0.3 : 0)
                .attr("fill", "none")
                .attr("stroke", planetColors.sun)
                .attr("stroke-width", 2)
                .attr("x2", d => d[0]*esFactor(d))
                .attr("y2", d => -d[1]*esFactor(d)),
              update => update
                .attr("opacity", d => (d[5] == iNow)? 0.3 : 0)
                .attr("x2", d => d[0]*esFactor(d))
                .attr("y2", d => -d[1]*esFactor(d)),
              exit => exit.remove());
      // Draw Mars lines truncated at Mars for newly defined Earth points,
      // extended beyond Mars for Earth points used to compute this Mars point.
      let marsPt = (d, k) => {
        const [iDef, jDef] = d.slice(5);
        const [xm, ym] = xym[iNow + iRef];
        if (iNow == iDef) {
          return k? -ym*AU : xm*AU;
        }
        const odi = this.orbitDirections[iNow + iRef];
        let jMin = odi[0][1];
        let [mex, mey] = odi[jDef - jMin][2];
        let [xe, ye] = d;
        let r = Math.sqrt((xm - d[0])**2 + (ym - d[1])**2) + 0.3;
        if (k) {
          return -(ye + r*mey)*AU;
        } else {
          return (xe + r*mex)*AU;
        }
      }
      this.marsLines.selectAll("line")
        .data(xye.filter(d => this.earthType(d) >= 2))
        .join(enter => enter.append("line")
                .attr("opacity", 0.3)
                .attr("fill", "none")
                .attr("stroke", planetColors.mars)
                .attr("stroke-width", 2)
                .attr("x1", d => marsPt(d, 0)).attr("y1", d => marsPt(d, 1))
                .attr("x2", d => d[0]*AU).attr("y2", d => -d[1]*AU),
              update => update
                .attr("opacity", 0.3)
                .attr("x1", d => marsPt(d, 0)).attr("y1", d => marsPt(d, 1))
                .attr("x2", d => d[0]*AU).attr("y2", d => -d[1]*AU),
              exit => exit.remove());
    } else {
      // state 2 only works for i = 0??
      iNow = 0;
      this.marsGroup.attr("display", "none");
      // Earth points, Mars and Sun lines defined by reference opposition
      const [xm, ym] = this.oppositionsFound[this.iOppo][2];
      let xyeRefOnly = xye.filter(d => d[5]==0);
      this.earthGroup.selectAll("circle")
        .data(xyeRefOnly)
        .join(enter => enter.append("circle")
                .attr("stroke", "none")
                .attr("fill", planetColors.earth)
                .attr("cx", d => d[0]*AU).attr("cy", d => -d[1]*AU)
                .attr("r", 4),
              update => update
                .attr("opacity", null)
                .attr("cx", d => d[0]*AU).attr("cy", d => -d[1]*AU),
              exit => exit.remove());
      // Add back the points near opposition and conjunction.
      const xye0 = this.orbitDirections[iRef].map(
        ([ii, jj, m, [sex, sey], cross, flag]) => (flag == 0)? xye[jj+jRef] :
            [-1.8*sex, -1.8*sey, m, [sex, sey], flag, ii, jj]);
      this.sunLines.selectAll("line")
        .data(xye0)
        .join(enter => enter.append("line")
              .attr("opacity", d => (d[4] == 0)? 0.3 : 0)
                .attr("fill", "none")
                .attr("stroke", planetColors.sun)
                .attr("stroke-width", 2)
                .attr("x2", d => d[0]*AU).attr("y2", d => -d[1]*AU),
              update => update
                .attr("opacity", d => (d[4] == 0)? 0.3 : 0)
                .attr("x2", d => d[0]*AU).attr("y2", d => -d[1]*AU),
              exit => exit.remove());
      this.marsLines.selectAll("line")
        .data(xyeRefOnly)
        .join(enter => enter.append("line")
                .attr("opacity", 0.3)
                .attr("fill", "none")
                .attr("stroke", planetColors.mars)
                .attr("stroke-width", 2)
                .attr("x1", d => xm*AU).attr("y1", d => -ym*AU)
                .attr("x2", d => d[0]*AU).attr("y2", d => -d[1]*AU),
              update => update
                .attr("opacity", 0.3)
                .attr("x1", xm*AU).attr("y1", -ym*AU)
                .attr("x2", d => d[0]*AU).attr("y2", d => -d[1]*AU),
              exit => exit.remove());
    }
    // highlight ijNow
    let ijTest = d => {
      const jDef = d[6];
      if (jDef != jNow) return false;
      const odi = this.orbitDirections[iNow + iRef];
      let jMin = odi[0][1];
      return odi[jDef - jMin][0] == iNow;
    }
    [this.sunLines, this.marsLines].forEach(
      s => s.selectAll("line").filter(d => ijTest(d))
        .attr("opacity", 1)
        .attr("stroke-width", 3));
  }

  orbitPoints(iOppo) {
    const [max, min, abs, sqrt] = [Math.max, Math.min, Math.abs, Math.sqrt];
    const [floor, ceil] = [Math.floor, Math.ceil];
    const tStart = this.mars.elapsed0;
    const tStop = tStart + 7310;
    const earthYear = this.earthYear;
    const marsYear = this.marsEstimate;
    // Complete range of Earth years is +-7310 days from t0,
    // which is always +-20 years, for a total of 41 points
    // with opposition iOppo at index 20 of these steps.
    // Corresponding number of Mars points is +-marsMax:
    let t0 = this.oppositionsFound[iOppo][1];
    const tmid = 0.5*(tStart + tStop);
    const [imin, imax] = [ceil((tmid - 7310 - t0)/earthYear),
                          floor((tmid + 7310 - t0)/earthYear)];
    const marsMax = floor(7310/marsYear);
    const tan15 = Math.tan(Math.PI / 12);
    const nearOppo = 0.1;
    return [-imin, d3.range(imin, imax+1).map(
      i => {
        let ti = t0 + i*earthYear;
        let [jn, jx] = [max(ceil((tStart - ti)/marsYear), -marsMax),
                        min(floor((tStop - ti)/marsYear), marsMax)];
        let nfull = (tStart - ti)/marsYear;
        let ifull = ceil(nfull);
        let sightLines = new Array(jx - jn + 1);
        for (let j=jn ; j<=jx ; j+=1) {
          let tij = ti + j*marsYear;
          let m = directionOf("mars", tij, true);
          let s = directionOf("sun", tij);
          let [mex, mey, mez] = m;
          let r = sqrt(mex**2 + mey**2);
          [mex, mey] = [mex/r, mey/r];
          m = [mex, mey, m];  // hybrid 2D unit vector, 3D unit vector
          let [sex, sey] = s;
          let [dot, cross] = [sex*mex + sey*mey, sex*mey - sey*mex];
          // flag = -1 if within 15 deg of conjunction
          //      = 1 is within atan(0.1) of opposition
          //      = 0 otherwise
          let flag = (abs(cross) < tan15*dot)? -1 :
              ((abs(cross) < -nearOppo*dot)? 1 : 0);
          // avoid any issues with i or j equal to -0
          sightLines[j-jn] = [i? i : 0, j, m, s, cross, flag];
        }
        return sightLines;
      })];
  }

  activate(on) {
    if (on) {
      let oldElapsed0 = this.clock.elapsed0;
      this.clock.addElapsed((r, ir) => this.mars.elapsedUpdate(r, ir));
      this.clock.elapsed0 = oldElapsed0;
      if (oldElapsed0 === undefined) {
        this.clock.elapsed0 = this.clock.dayNow;
      }
      if (this.notReady()) {
        this.clock.disabled = false;
      } else {
        this.clock.disabled = true;
      }
    } else {
      if (this.clock.disabled && this.mars.yearEstimate != this.marsEstimate) {
        this.clock.disabled = false;
        this.mars.changeYearEstimate(this.marsEstimate);
      } else {
        this.clock.disabled = false;
      }
    }
  }

  update() {
    // if (this.svg.node().parentElement.style.display == "none") return;
  }
}


class Inclination {
  static #width = 750;
  static #height = Inclination.#width;

  constructor(d3Parent, clock, survey) {
    let [width, height] = [Inclination.#width, Inclination.#height];

    this.svg = d3Parent.append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
      .attr("class", "Inclination")
      .attr("viewBox", [-width/2, -height/2, width, height])
      .style("display", "block")
      .style("margin", "20px")  // padding does not work for SVG?
      .style("background-color", "#bbb")
      .attr("text-anchor", "middle")
      .attr("font-family", "'Merriweather Sans', sans-serif")
      .attr("font-weight", "bold")
      .attr("font-size", 12)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    this.clock = clock;
    this.survey = survey;

    // Scale is 1 AU = width/3.6, same as zoomLevel=0 in OrbitView.
    const AU = width / 3.6;
    this.AU = AU;

    this.instructions = this.svg.append("g").call(
      g =>  {
        g.attr("display", "block");
        g.append("text")
          .attr("pointer-events", "none")
          .attr("fill", "#960")
          .attr("font-size", 20)
          .attr("y", -height/2 + 100)
          .text("Not ready to find inclination of Mars orbit.")
          .clone(true)
          .attr("y", -height/2 + 130)
          .text("Return to Survey Orbits tab to determine orbit.");
      });

    // Crosshair tick at top useful for aligning node line.
    this.svg.append("line")
      .style("pointer-events", "none")
      .attr("stroke", "#444").attr("stroke-width", 1)
      .attr("x1", 0).attr("y1", -height/2)
      .attr("x2", 0).attr("y2", -height/2 + 20)

    // Points on orbits are in five groups to try to plot them back to front:
    // backMars - points on Mars orbit behind plane containing Sun
    // backEarth - points on Earth orbit behind plane containing Sun
    // sunGroup
    // frontEarth - points on Earth orbit in front of Sun plane
    // frontMars - points on Mars orbit in front of Sun plane
    // Earth-Mars sight lines are grouped with their furthest back endpoint.
    this.backMarsp = this.svg.append("g");
    this.backMars = this.svg.append("g");
    this.backEarth = this.svg.append("g");
    this.sunPlane = this.svg.append("g").call(
      g => {
        g.append("line")  // line of nodes
          .attr("opacity", 0)
          .attr("stroke", clock.planetColors.earth)
          .attr("stroke-width", 3);
        g.append("circle")  // Sun marker
          .attr("stroke", "none")
          .attr("fill", clock.planetColors.sun)
          .attr("cx", 0).attr("cy", 0)
          .attr("r", 8);
      });
    this.frontEarth = this.svg.append("g");
    this.frontMarsp = this.svg.append("g");
    this.frontMars = this.svg.append("g");
    // Bigger target to toggle off lines:
    this.linesOff = this.svg.append("circle")
      .attr("display", "none")
      .attr("cursor", "pointer")
      .attr("opacity", 0)
      .attr("stroke", "none")
      .attr("fill", clock.planetColors.mars)
      .attr("cx", 0).attr("cy", 0)
      .attr("r", 15)
      .on("click", () => this.emShow(-1));
    this.iNow = -1;  // Earth-Mars lines

    // Create 3D rotation sliders.
    // Vertical is tilt angle: top = ecliptic edge-on, bottom = face-on
    // Horizontal is ecliptic azimuth: 180 degree full scale,
    //   center makes face-on view the same view as OrbitView and SurveyOrbits.
    // Horizontal rotation applied first, then vertical.
    this.rotHoriz = new Slider(this.svg, [-width/2 + 130, width/2 - 70],
                               height/2 - 24, -0.5*Math.PI, 0.5*Math.PI,
                               () => this.replot());
    this.rotVert = new Slider(this.svg, width/2 - 24,
                              [height/2 - 70, -height/2 + 130], 0, 0.5*Math.PI,
                              () => this.replot());
    this.rotVert.sSet(0);

    // Create Reset button, lower left, resets rotation angles.
    this.resetButton = this.svg.append("g").call(
      g => {
        buttonBox(g.append("rect"), -width/2 + 10, height/2 - 38, 80, 28,
                  () => this.resetRotation());
        buttonText(g.append("text"), -width/2 + 49, height/2 - 16, "Reset", 20,
                   () => this.resetRotation());
      });

    // Create z-magnify 1x, 3x, 10x buttons.
    this.zmag = 1;
    this.zmagButtons = this.svg.append("g").call(
      g => {
        g.append("text")
          .attr("pointer-events", "none")
          .attr("text-anchor", "start")
          .attr("fill", "#000")
          .attr("font-size", 20)
          .attr("x", -width/2 + 10)
          .attr("y", -height/2 + 25)
          .text("magnify z:");
        buttonBox(g.append("rect"), -width/2 + 10, -height/2 + 40, 51, 28,
                  () => this.zmagSet(1));
        buttonText(g.append("text"), -width/2 + 36, -height/2 + 62, "1×", 20,
                  () => this.zmagSet(1));
        buttonBox(g.append("rect"), -width/2 + 10, -height/2 + 77, 51, 28,
                  () => this.zmagSet(3));
        buttonText(g.append("text"), -width/2 + 36, -height/2 + 99, "3×", 20,
                  () => this.zmagSet(3));
        buttonBox(g.append("rect"), -width/2 + 10, -height/2 + 114, 51, 28,
                  () => this.zmagSet(10));
        buttonText(g.append("text"), -width/2 + 36, -height/2 + 136, "10×", 20,
                   () => this.zmagSet(10));
        this.magDot = g.append("circle")
          .attr("stroke", "none")
          .attr("fill", "#000")
          .attr("cx", -width/2 + 72).attr("cy", -height/2 + 54)
          .attr("r", 5);
      });
  }

  activate(on) {
    if (!on) {
      this.clock.disabled = false;
      return;
    }
    this.clock.disabled = true;

    const survey = this.survey;
    let oldElapsed0 = this.clock.elapsed0;
    this.clock.addElapsed((r, ir) => survey.mars.elapsedUpdate(r, ir));
    this.clock.elapsed0 = oldElapsed0;
    if (oldElapsed0 === undefined) {
      this.clock.elapsed0 = this.clock.dayNow;
    }
    if (!survey.xyMars ||
        survey.xyMars.length != survey.xyMars.filter(x => x).length) {
      this.ready = false;
      this.backMarsp.selectAll("*").remove();
      this.backMars.selectAll("*").remove();
      this.backEarth.selectAll("*").remove();
      this.sunPlane.select("line").attr("opacity", 0);
      this.frontEarth.selectAll("*").remove();
      this.frontMarsp.selectAll("*").remove();
      this.frontMars.selectAll("*").remove();
      this.instructions.attr("display", "block");
      this.resetRotation();
      this.zmagSet(1);
      this.iNow = -1;
      this.linesOff.attr("display", "none");
      return;
    }
    this.ready = true;
    const iRef = survey.iRef;
    const jRef = survey.jRef;
    this.iNow = survey.ijNow[0] + iRef;

    const xym = survey.xyMars;
    const xye = survey.xyEarth;
    const od = survey.orbitDirections;
    const earthYear = survey.earthYear;
    const marsYear = survey.marsEstimate;
    const tStart = survey.mars.elapsed0;
    const t0 = survey.oppositionsFound[survey.iOppo][1];
    const sqrt = Math.sqrt;
    // Flags for highlighting Earth-Mars sight lines.
    this.emFlags = xym.map(() => new Array(xye.length).fill(false));
    // Endpoints of Earth-Mars sight lines for each point on Mars orbit.
    this.emLines = xym.map(
      ([xm, ym], i) => od[i].filter(d => d[5]>=0).map(
        ([ii, jj, [mx, my, [mex, mey, mez]]]) => {
          let [i0, j0] = [ii + iRef, jj + jRef];
          let [xe, ye] = xye[j0];
          let ze = xye[j0][7];
          let [xm, ym, chi2, n, idef, zm] = xym[i0];
          this.emFlags[i0][j0] = true;
          let r = sqrt((xm - xe)**2 + (ym - ye)**2 + (zm - ze)**2) + 0.3;
          let [x, y, z] = [xe + r*mex, ye + r*mey, ze + r*mez];
          return [[xe, ye, ze], [x, y, z], zm, [ii, jj]];
        }));
    this.t0 = t0;  // save time of reference opposition for later
    this.tStart = tStart;  // save start of 7310 day data interval for later
    // 3D points on Earth orbit.
    this.xyze = xye.map(([xe, ye, a, b, c, d, e, ze]) => [xe, ye, ze]);
    // 3D points on Mars orbit (mean of z coordinate, plus variance of z)
    this.xyzm = xym.map(([xm, ym, chi2, n, idef, zm]) => [xm, ym, zm, chi2/n]);
    // Get least squares best fit to orbital plane.
    let [x2, xy, y2, xz, yz] = this.xyzm.reduce(
      ([x2, xy, y2, xz, yz], [x, y, z, zvar]) =>
        [x2+x**2, xy+x*y, y2+y**2, xz+x*z, yz+y*z], [0, 0, 0, 0, 0]);
    let det = x2*y2 - xy**2;
    // Gradient (nx, ny) of z(x, y) is normal to line of nodes:
    let [nx, ny] = [(y2*xz - xy*yz) / det, (x2*yz - xy*xz) / det];
    this.tani = Math.sqrt(nx**2 + ny**2);  // tangent of inclination
    this.anode = [ny/this.tani, -nx/this.tani, 0];  // ascending node direction
    this.zerr = this.xyzm.reduce(
      (dz2, [x, y, z, zvar]) => dz2 + (nx*x + ny*y - z)**2, 0);
    this.zerr = Math.sqrt(this.zerr / this.xyzm.length);

    this.instructions.attr("display", "none");
    this.replot();
    this.sunPlane.select("line").attr("opacity", 0.25);
  }

  replot() {
    if (!this.ready) return;
    // Points on Mars orbit
    // Points on Mars orbit projected into ecliptic (transparent)
    // Points on Earth orbit (normally transparent)
    // Line of nodes
    // Lines to Mars point from all defining Earth points (opaque)
    this.getProjection();
    let xyze = this.xyze.map(xyz => this.project(xyz));
    let xyzm = this.xyzm.map(xyz => this.project(xyz));
    let xyzmp = this.xyzm.map(xyz => this.project(xyz, true));
    let [xnode, ynode] = this.project(this.anode, true);
    xyzm = xyzm.map(([x, y, z], i) => [x, y, z, i]);
    xyze = xyze.map(([x, y, z], j) => [x, y, z, j]);
    let iNow = this.iNow;
    let emFlag = (iNow < 0)? new Array(xyze.length).fill(false) :
        this.emFlags[iNow];
    let eIsLit = xyz => emFlag[xyz[3]]? 1 : 0.15;

    const AU = this.AU;
    const [mcolor, ecolor] = [this.clock.planetColors.mars,
                              this.clock.planetColors.earth];
    this.backMarsp.selectAll("circle")
      .data(xyzmp.filter(xyz => xyz[2]<0))
      .join(enter => enter.append("circle")
              .attr("pointer-events", "none")
              .attr("opacity", 0.15)
              .attr("stroke", "none")
              .attr("fill", mcolor)
              .attr("cx", xyz => xyz[0]*AU).attr("cy", xyz => -xyz[1]*AU)
              .attr("r", 4),
            update => update
              .attr("cx", xyz => xyz[0]*AU).attr("cy", xyz => -xyz[1]*AU),
            exit => exit.remove());
    this.backMars.selectAll("circle")
      .data(xyzm.filter(xyz => xyz[2]<0))
      .join(enter => enter.append("circle")
              .attr("cursor", "pointer")
              .attr("stroke", "#0000")
              .attr("stroke-width", 20)
              .attr("fill", mcolor)
              .attr("cx", xyz => xyz[0]*AU).attr("cy", xyz => -xyz[1]*AU)
              .attr("r", 4)
              .on("click", (event, xyz) => this.emShow(xyz[3])),
            update => update
              .attr("cx", xyz => xyz[0]*AU).attr("cy", xyz => -xyz[1]*AU)
              .on("click", (event, xyz) => this.emShow(xyz[3])),
            exit => exit.remove());
    this.backEarth.selectAll("circle")
      .data(xyze.filter(xyz => xyz[2]<0))
      .join(enter => enter.append("circle")
              .attr("pointer-events", "none")
              .attr("opacity", eIsLit)
              .attr("stroke", "none")
              .attr("fill", ecolor)
              .attr("cx", xyz => xyz[0]*AU).attr("cy", xyz => -xyz[1]*AU)
              .attr("r", 4),
            update => update
              .attr("cx", xyz => xyz[0]*AU).attr("cy", xyz => -xyz[1]*AU),
            exit => exit.remove());
    this.sunPlane.select("line")
      .attr("x1", 1.75*xnode*AU).attr("y1", -1.75*ynode*AU)
      .attr("x2", -1.75*xnode*AU).attr("y2", 1.75*ynode*AU)
    this.frontEarth.selectAll("circle")
      .data(xyze.filter(xyz => xyz[2]>=0))
      .join(enter => enter.append("circle")
              .attr("pointer-events", "none")
              .attr("opacity", eIsLit)
              .attr("stroke", "none")
              .attr("fill", ecolor)
              .attr("cx", xyz => xyz[0]*AU).attr("cy", xyz => -xyz[1]*AU)
              .attr("r", 4),
            update => update
              .attr("cx", xyz => xyz[0]*AU).attr("cy", xyz => -xyz[1]*AU),
            exit => exit.remove());
    this.frontMarsp.selectAll("circle")
      .data(xyzmp.filter(xyz => xyz[2]>=0))
      .join(enter => enter.append("circle")
              .attr("pointer-events", "none")
              .attr("opacity", 0.15)
              .attr("stroke", "none")
              .attr("fill", mcolor)
              .attr("cx", xyz => xyz[0]*AU).attr("cy", xyz => -xyz[1]*AU)
              .attr("r", 4),
            update => update
              .attr("cx", xyz => xyz[0]*AU).attr("cy", xyz => -xyz[1]*AU),
            exit => exit.remove());
    this.frontMars.selectAll("circle")
      .data(xyzm.filter(xyz => xyz[2]>=0))
      .join(enter => enter.append("circle")
              .attr("cursor", "pointer")
              .attr("stroke", "#0000")
              .attr("stroke-width", 20)
              .attr("fill", mcolor)
              .attr("cx", xyz => xyz[0]*AU).attr("cy", xyz => -xyz[1]*AU)
              .attr("r", 4)
              .on("click", (event, xyz) => this.emShow(xyz[3])),
            update => update
              .attr("cx", xyz => xyz[0]*AU).attr("cy", xyz => -xyz[1]*AU)
              .on("click", (event, xyz) => this.emShow(xyz[3])),
            exit => exit.remove());

    if (iNow >= 0) {
      this.emShow();
    }
  }

  emShow(i) {
    if (i === undefined) {
      i = this.iNow;
    } else {
      this.backMars.selectAll("line").remove();
      this.frontMars.selectAll("line").remove();
      this.backEarth.selectAll("circle").attr("opacity", 0.15);
      this.frontEarth.selectAll("circle").attr("opacity", 0.15);
      if (i == this.iNow || i < 0) {  // just toggle off
        this.iNow = -1;
        this.linesOff.attr("display", "block");
        return;
      }
    }
    const lines = this.emLines[i];
    let xyz12 = lines.map(d => [this.project(d[0]), this.project(d[1])]);
    // Append flag that is true if line should be plotted in back
    xyz12 = xyz12.map(([[x1, y1, z1], [x2, y2, z2]]) =>
                      [[x1, y1, z1], [x2, y2, z2],
                       (z1<0 && z2<-z1) || (z2<0 && z1<-z2)]);
    const mcolor = this.clock.planetColors.mars;
    const AU = this.AU;
    this.backMars.selectAll("line")
      .data(xyz12.filter(d => d[2]))
      .join("line")
      .attr("pointer-events", "none")
      .attr("stroke", mcolor)
      .attr("stroke-width", 2)
      .attr("x1", d => d[0][0]*AU).attr("y1", d => -d[0][1]*AU)
      .attr("x2", d => d[1][0]*AU).attr("y2", d => -d[1][1]*AU);
    this.frontMars.selectAll("line")
      .data(xyz12.filter(d => !d[2]))
      .join("line")
      .attr("pointer-events", "none")
      .attr("stroke", mcolor)
      .attr("stroke-width", 2)
      .attr("x1", d => d[0][0]*AU).attr("y1", d => -d[0][1]*AU)
      .attr("x2", d => d[1][0]*AU).attr("y2", d => -d[1][1]*AU);
    this.iNow = i;
    let xyzm = this.project(this.xyzm[i]);
    this.linesOff
      .attr("display", "block")
      .attr("cx", xyzm[0]*AU).attr("cy", -xyzm[1]*AU);
    let emFlag = (i < 0)? new Array(this.xyze.length).fill(false) :
        this.emFlags[i];
    let eIsLit = xyz => emFlag[xyz[3]]? 1 : 0.15;
    this.backEarth.selectAll("circle").attr("opacity", eIsLit);
    this.frontEarth.selectAll("circle").attr("opacity", eIsLit);
  }

  project([x, y, z], ecliptic=false) {
    if (ecliptic) z = 0;
    const [mxx, mxy, myx, myy, myz, mzx, mzy, mzz] = this.rotMatrix;
    return [mxx*x + mxy*y, myx*x + myy*y + myz*z, mzx*x + mzy*y + mzz*z];
  }

  getProjection() {
    const [hang, vang] = [this.rotHoriz.s, this.rotVert.s];
    const [ch, sh] = [Math.cos(hang), Math.sin(hang)];
    const [cv, sv] = [Math.cos(vang), Math.sin(vang)];
    // Apply z-axis rotation first (z1 = z0):
    // x1 = ch*x0 - sh*y0
    // y1 = sh*x0 + ch*y0
    // Then x-axis rotation (x2=x1):
    // x2 =  x1            =  ch   *x0 - sh   *y0
    // y2 =  cv*y1 + sv*z1 =  cv*sh*x0 + cv*ch*y0 + sv*z0
    // z2 = -sv*y1 + cv*z1 = -sv*sh*x0 - sv*ch*y0 + cv*z0
    // Apply zmag factor to z0 here as well:
    const zmag = this.zmag;
    this.rotMatrix = [ch, -sh, cv*sh, cv*ch, sv*zmag, -sv*sh, -sv*ch, cv*zmag];
  }

  zmagSet(factor) {
    if (this.zmag == factor) return;
    this.zmag = factor;
    const dcy = (factor==1)? 54 : (factor == 3)? 91 : 128;
    this.magDot.attr("cy", -Inclination.#height/2 + dcy);
    this.replot();
  }

  resetRotation() {
    this.rotHoriz.sSet(0, true);
    this.rotVert.sSet(0, true);
    this.replot();
  }
}


class TwoLaws {
  static #width = 750;
  static #height = TwoLaws.#width;

  constructor(d3ParentL, d3ParentR, incline) {
    let [width, height] = [TwoLaws.#width, TwoLaws.#height];

    this.svgl = d3ParentL.append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
      .attr("class", "LeftTwoLaws")
      .attr("viewBox", [-width/2, -height/2, width, height])
      .style("display", "block")
      .style("margin", "20px")  // padding does not work for SVG?
      .style("background-color", "#aaa")
      .attr("text-anchor", "middle")
      .attr("font-family", "'Merriweather Sans', sans-serif")
      .attr("font-weight", "bold")
      .attr("font-size", 12)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    this.svgr = d3ParentR.append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
      .attr("class", "LeftTwoLaws")
      .attr("viewBox", [-width/2, -height/2, width, height])
      .style("display", "block")
      .style("margin", "20px")  // padding does not work for SVG?
      .style("background-color", "#aaa")
      .attr("text-anchor", "middle")
      .attr("font-family", "'Merriweather Sans', sans-serif")
      .attr("font-weight", "bold")
      .attr("font-size", 12)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    this.clock = clock;
    this.incline = incline;

    this.svgl.append("text")
      .attr("fill", "#000")
      .attr("font-size", 24)
      .text("Two Laws left panel");

    this.svgr.append("text")
      .attr("fill", "#000")
      .attr("font-size", 24)
      .text("Two Laws right panel");

    // Scale is 1 AU = width/3.6, same as zoomLevel=0 in OrbitView.
    const AU = width / 3.6;
    this.AU = AU;
  }

  activate(on) {
    if (on) {
    }
  }

  setPlanet(planet) {
  }
}


class ThirdLaw {
  static #width = 750;
  static #height = ThirdLaw.#width;

  constructor(d3ParentL, d3ParentR, incline) {
    let [width, height] = [ThirdLaw.#width, ThirdLaw.#height];

    this.svgl = d3ParentL.append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
      .attr("class", "LeftThirdLaw")
      .attr("viewBox", [-width/2, -height/2, width, height])
      .style("display", "block")
      .style("margin", "20px")  // padding does not work for SVG?
      .style("background-color", "#aaa")
      .attr("text-anchor", "middle")
      .attr("font-family", "'Merriweather Sans', sans-serif")
      .attr("font-weight", "bold")
      .attr("font-size", 12)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    this.svgr = d3ParentR.append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
      .attr("class", "LeftThirdLaw")
      .attr("viewBox", [-width/2, -height/2, width, height])
      .style("display", "block")
      .style("margin", "20px")  // padding does not work for SVG?
      .style("background-color", "#aaa")
      .attr("text-anchor", "middle")
      .attr("font-family", "'Merriweather Sans', sans-serif")
      .attr("font-weight", "bold")
      .attr("font-size", 12)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    this.clock = clock;
    this.incline = incline;

    this.svgl.append("text")
      .attr("fill", "#000")
      .attr("font-size", 24)
      .text("Third Law left panel");

    this.svgr.append("text")
      .attr("fill", "#000")
      .attr("font-size", 24)
      .text("Third Law right panel");

    // Scale is 1 AU = width/3.6, same as zoomLevel=0 in OrbitView.
    const AU = width / 3.6;
    this.AU = AU;
  }

  activate(on) {
    if (on) {
    }
  }

  setPlanet(planet) {
  }
}


function buttonBox(rectSel, x, y, width, height, callback) {
  rectSel.attr("x", x).attr("y", y)
    .attr("width", width).attr("height", height)
    .attr("rx", 5)
    .style("fill", "#fdf8e0")
    .style("stroke", "#000")
    .style("stroke-width", 2)
    .style("cursor", "pointer")
    .on("click", callback);
}


function buttonText(textSel, x, y, text, size, callback) {
  textSel.attr("font-size", size)
    .attr("x", x)
    .attr("y", y)
    .style("cursor", "pointer")
    .text(text)
    .on("click", callback);
}


function zoomButtons(width, objectThis) {
  let [xbox, ybox] = [-width/2, -width/2];
  let dbox = 0.045*width;
  let gap = 0.01*width;
  return objectThis.svg.append("g").call(
    g => {
      g.append("path").call(
        p => {
          let d3p = d3.path();
          d3p.moveTo(xbox+gap, ybox+dbox);
          d3p.lineTo(xbox+gap, ybox+gap);
          d3p.lineTo(xbox+dbox, ybox+gap);
          d3p.closePath();
          p.style("cursor", "pointer")
            .style("stroke", "#000")
            .style("stroke-width", 2)
            .style("fill", "#fdf8e0")
            .attr("d", d3p)
            .on("click", () => objectThis.zoomer(0));
        });
      g.append("path").call(
        p => {
          let d3p = d3.path();
          d3p.moveTo(xbox+dbox+0.5*gap, ybox+1.5*gap);
          d3p.lineTo(xbox+dbox+0.5*gap, ybox+dbox+0.5*gap);
          d3p.lineTo(xbox+1.5*gap, ybox+dbox+0.5*gap);
          d3p.closePath();
          p.style("cursor", "pointer")
            .style("stroke", "#000")
            .style("stroke-width", 2)
            .style("fill", "#fdf8e0")
            .attr("d", d3p)
            .on("click", () => objectThis.zoomer(1));
        });
    });
}


class Slider {
  // Assume smin < smax, smin corresponds to x1(or y1), smax to x2 (or y2).
  constructor(parent, x12, y12, smin, smax, callback) {
    [this.x1, this.x2] = Array.isArray(x12)? x12 : [x12, x12];
    [this.y1, this.y2] = Array.isArray(y12)? y12 : [y12, y12];
    [this.smin, this.smax] = [smin, smax];
    this.callback = callback;
    this.s = 0.5*(smin + smax);
    this.horiz = this.x1 != this.x2;
    if (this.horiz) this.y2 = this.y1;  // enforce either vertical or horizontal
    this.slope = (smax - smin) /
      (this.horiz? (this.x2 - this.x1) : (this.y2 - this.y1));
    this.xy1 = this.horiz? this.x1 : this.y1;
    this.xy = this.xyOf(this.s);
    parent.append("line")
      .attr("stroke", "#000")
      .attr("stroke-width", 5)
      .attr("x1", this.x1).attr("y1", this.y1)
      .attr("x2", this.x2).attr("y2", this.y2);
    const starter = (event, d) => this.dragStart(event, d);
    const dragger = (event, d) => this.dragMove(event, d);
    this.marker = parent.append("circle")
      .attr("cursor", "pointer")
      .attr("stroke", "#000")
      .attr("stroke-width", 2)
      .attr("fill", "#fdf8e0")
      .attr("cx", 0.5*(this.x1 + this.x2)).attr("cy", 0.5*(this.y1 + this.y2))
      .attr("r", 14)
      .call(d3.drag().on("start", starter).on("drag", dragger))
      .on("touchstart", starter).on("touchmove", dragger);
  }

  dragStart(event, d) {
    const [x, y] = [event.x, event.y];
    this.dragOffset = this.xy - (this.horiz? x : y);
  }

  dragMove(event, d) {
    const [x, y] = [event.x, event.y];
    let xy;
    if (this.horiz) {
      xy = x + this.dragOffset;
    } else {
      xy = y + this.dragOffset
    }
    let s = this.sOf(xy);
    if (s < this.smin) {
      s = this.smin;
      xy = this.xyOf(s);
    } else if (s > this.smax) {
      s = this.smax;
      xy = this.xyOf(s);
    }
    this.s = s;
    this.xy = xy;
    this.marker.attr(this.horiz? "cx" : "cy", xy);
    this.callback(s);
  }

  xyOf(s) {
    return this.xy1 + (s - this.smin)/this.slope;
  }

  sOf(xy) {
    return this.smin + (xy - this.xy1)*this.slope;
  }

  sSet(s, inhibitCallback=false) {
    if (s < this.smin) s = smin;
    else if (s > this.smax) s = smax;
    let xy = this.xyOf(s);
    this.s = s;
    this.xy = xy;
    this.marker.attr(this.horiz? "cx" : "cy", xy);
    if (!inhibitCallback) this.callback(s);
    return s;
  }
}


/**
 * Find the intersection point of two lines
 *
 * @param {Array} line1 - [px, py, ex, ey] where (px, py) is a point on the
 *    line and (ex, ey) is the normalized direction of the line.
 * @param {Array} line2 - [px, py, ex, ey] for the second line.
 *    line2 may be only [ex, ey] if px = py = 0
 *
 * @return {Array<number>} - [x, y] coordinates of intersection point
 */
function intersectionOf(line1, line2) {
  let [px1, py1, ex1, ey1] = line1;
  if (line2.length < 4) {
    let [ex2, ey2] = line2;
    let r = (py2*ex2 - px2*ey2) / (ex2*ey1 - ey2*ex1);
    return [r*ex1, r*ey1];
  } else {
    let [px2, py2, ex2, ey2] = line2;
    let det = ex2*ey1 - ey2*ex1;
    let [c1, c2] = [(px1*ey1 - py1*ex1)/det, (px2*ey2 - py2*ex2)/det];
    return [c1*ex2 - c2*ex1, c1*ey2 - c2*ey1];
  }
}


/**
 * Find the point with least RMS distance to a given set of lines, that is,
 * the point most nearly at the common intersection of all the lines.
 * Optionally, find approximate point with smallest RMS angular difference
 * from the given lines relative to the points on the lines.  (More
 * precisely, the mean square distances are weighted inversely by the
 * square of the distance from the points to the least RMS distance point.)
 *
 * @param {Array} lines - [[px, py, pz, ex, ey, ez], ...] where (px, py) is a
 *    point on the line and (ex, ey, ez) is normalized direction of the line
 * @param {bool} [angular] - true (default false) to minimize RMS angle
 *
 * @return {Array<number>} - [x, y, z, chi2] coordinates of point and residual
 */
function nearestPointTo(lines, angular=false) {
  // let lines2 = lines.map(([px, py, pz, ex, ey, ez]) => [px, py, ex, ey]);
  // let [xx, yy, cc] = nearestPointTo2(lines2);
  // return [xx, yy, 0, cc];
  let mxyz = lines.map(
    ([px, py, pz, ex, ey, ez]) => {
      // ez=Math.sqrt(ex**2+ey**2); [ex,ey]=[ex/ez,ey/ez]; ez=0;
      let dot = px*ex + py*ey + pz*ez;
      return [1 - ex*ex, 1 - ey*ey, 1 - ez*ez, -ex*ey, -ey*ez, -ez*ex,
              px - ex*dot, py - ey*dot, pz - ez*dot];
    }).reduce((prev, cur) => prev.map((v, i) => v+cur[i]));
  let [x, y, z] = symSolve3(mxyz, mxyz.slice(6));
  if (!angular) {
    // return least RMS distance point
    let chi2 = lines.map(
      ([px, py, pz, ex, ey, ez]) => {
        let [u, v, w] = [x - px, y - py, z - pz];
        // w = ez = 0;
        return (u*ey - v*ex)**2 + (v*ez - w*ey)**2 + (w*ex - u*ez)**2;
      }).reduce((prev, cur) => prev + cur);
    return [x, y, z, chi2];
  }
  // compute approximate least RMS angle point using least RMS distance point
  mxyz = lines.map(
    ([px, py, pz, ex, ey, ez]) => {
      let w = 1. / ((x - px)**2 + (y - py)**2 + (z - pz)**2);
      // ez=Math.sqrt(ex**2+ey**2); [ex,ey]=[ex/ez,ey/ez]; ez=0;
      let dot = px*ex + py*ey + pz*ez;
      return [w*(1 - ex*ex), w*(1 - ey*ey), w*(1 - ez*ez),
              -w*ex*ey, -w*ey*ez, -w*ez*ex,
              w*(px - ex*dot), w*(py - ey*dot), w*(pz - ez*dot)];
    }).reduce((prev, cur) => prev.map((v, i) => v+cur[i]));
  [x, y, z] = symSolve3(mxyz, mxyz.slice(6));
  // compute actual chi2 of angles, not using approximate weights
  let chi2 = lines.map(
    ([px, py, pz, ex, ey, ez]) => {
      let [u, v, w] = [x - px, y - py, z - pz];
      let r2 = u**2 + v**2 + w**2;
      return ((u*ey - v*ex)**2 + (v*ez - w*ey)**2 + (w*ex - u*ez)**2) / r2;
    }).reduce((prev, cur) => prev + cur);
  return [x, y, z, chi2];
}


/**
 * Solve symmetric 3x3 matrix m*x = b by Gaussian elimination.
 * Assumes mzz is largest (or nearly so) diagonal element to avoid pivoting.
 *
 * @param {Array<number>} matrix - [mxx, myy, mzz, mxy, myz, mzx]
 * @param {Array<number>} rhs - [bx, by, bz]
 *
 * @return {Array<number>} 
 */
function symSolve3(matrix, rhs) {
  let [mxx, myy, mzz, mxy, myz, mxz] = matrix;
  let [bx, by, bz] = rhs;
  let myx = mxy;  // also mzy = myz, mzx = mxz
  //  mxx mxy mxz   bx
  //  myx myy myz   by
  //  mzx mzy mzz   bz
  [mxx, mxy] = [mzz*mxx - mxz*mxz, mzz*mxy - mxz*myz];  // mxz -> 0
  bx = mzz*bx - mxz*bz;
  [myx, myy] = [mzz*myx - myz*mxz, mzz*myy - myz*myz];  // myz -> 0
  by = mzz*by - myz*bz;
  //  mxx mxy  0    bx
  //  myx myy  0    by
  //  mzx mzy mzz   bz
  [bx, by] = [myy*bx - mxy*by, mxx*by - myx*bx];
  mxx = myy*mxx - mxy*myx;
  [bx, by] = [bx/mxx, by/mxx];
  return [bx, by, (bz - myz*by - mxz*bx)/mzz];
}


function matmult(matrix, a) {
  let [mxx, myy, mzz, mxy, myz, mxz] = matrix;
  let [ax, ay, az] = a;
  return [mxx*ax+mxy*ay+mxz*az, mxy*ax+myy*ay+myz*az, mxz*ax+myz*ay+mzz*az];
}


// Oddball helper to make transition a no-op when duration is zero.
// https://github.com/d3/d3-transition/issues/93
d3.selection.prototype.maybeTransition = function(duration) {
  return duration > 0 ? this.transition().duration(duration) : this;
};

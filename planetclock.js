/**
 * @file PlanetClock class creates an interactive geocentric digital orrery.
 * @author David H. Munro
 * @copyright David H. Munro 2022
 * @license MIT
 *
 * This script depends on ephemeris.js and d3.
 * The required externals are:
 *     d3   from d3
 *     dayOfDate, dateOfDay, directionOf, timeSunAt   from ephemeris.js
 */


class PlanetClock {
  static #width = 750;  // just a convenient number, svg will scale
  static #height = PlanetClock.#width;
  static #rOuter = PlanetClock.#width * 0.5 - 20;
  static #rInner = PlanetClock.#rOuter * 0.71;

  constructor(d3Parent, initYear=2022) {
    this.svg = d3Parent.append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
      .attr("class", "PlanetClock")
      .attr("viewBox", [-PlanetClock.#width/2, -PlanetClock.#height/2,
                        PlanetClock.#width, PlanetClock.#height])
      .attr("text-anchor", "middle")
      .attr("font-family", "sans-serif")
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
                .text(d => `${d[2]}${"°"}`));
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
                .text(d => `${d[0]}${"°"}`)
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
                .text(d => `${d[0]}${"°"}`)
                .clone(true)
                .attr("y", d => d[1]));
      });

    // Otherwise callback will not have correct this when triggered.
    let yearSetter = (() => this.setYear()).bind(this);
    let sunDragger = ((event, d) => this.dragSun(event, d)).bind(this);
    let handToggler = ["mercury", "venus", "mars", "jupiter", "saturn"].map(
      p => (() => this.setHandVisibility(p)).bind(this));

    // Year indicator
    this.centerGroup = this.svg.append("g").call(
      g => {
        g.append("rect").call(
          r => buttonBox(r, -40, -0.50*rInner - 25.5, 80, 32, yearSetter));
        this.yearText = g.append("text").call(
          t => buttonText(t, 0, -0.50*rInner,
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
              .attr("stroke", "none")
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
      .attr("fill", "#ffd")
      .attr("stroke", "#000")
      .attr("stroke-width", 2)
      .attr("d", arrowr)
      .attr("transform", "rotate(-35)")
      .on("mousedown", (event, d) => this.startAnimation(false, 2))
      .on("touchstart", (event, d) => this.startAnimation(false, 2))
      .clone(true)
      .attr("transform", "rotate(-45)")
      .on("mousedown", (event, d) => this.startAnimation(false, 5))
      .on("touchstart", (event, d) => this.startAnimation(false, 5))
      .clone(true)
      .attr("transform", "rotate(-55)")
      .on("mousedown", (event, d) => this.startAnimation(false, 12))
      .on("touchstart", (event, d) => this.startAnimation(false, 12))
      .clone(true)
      .attr("d", arrowl)
      .attr("transform", "rotate(35)")
      .on("mousedown", (event, d) => this.startAnimation(true, 2))
      .on("touchstart", (event, d) => this.startAnimation(true, 2))
      .clone(true)
      .attr("transform", "rotate(45)")
      .on("mousedown", (event, d) => this.startAnimation(true, 5))
      .on("touchstart", (event, d) => this.startAnimation(true, 5))
      .clone(true)
      .attr("transform", "rotate(55)")
      .on("mousedown", (event, d) => this.startAnimation(true, 12))
      .on("touchstart", (event, d) => this.startAnimation(true, 12));
    this.svg.on("mouseup", (event, d) => this.stopAnimation())
      .on("touchend", (event, d) => this.stopAnimation())
      .on("mouseleave", (event, d) => this.stopAnimation());
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
    this.dayTimer = d3.timer((() => this.stepDay()).bind(this));
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
    let yElapsed = -0.25*PlanetClock.#rInner;
    let resetElapsed = (() => this.updateElapsed(true)).bind(this);
    this.elapsed0 = this.dayNow;
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
            ymd += `${date.getUTCHours()}:${date.getUTCMinutes()}`;
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
      delete this.elapsed0;
      delete this.elapsedUpdater;
      if (!fromAdd) {
        this.goToDay(day);
      }
    }
  }

  updateElapsed(reset, fromSetYear=false) {
    if (this.elapsed) {
      if (reset) {
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
      .attr("font-family", "sans-serif")
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
    let originCycler = (() => this.cycleOrigin()).bind(this);
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
    let period = [87.969257, 224.700799, 686.967971, 4332.820129,
                  10755.698644, 365.256355];  // J2000 sidereal periods (days)
    ["mercury", "venus", "mars", "jupiter", "saturn", "earth"].forEach(
      (p, i) => {
        let d3p = d3.path();
        let dt = period[i] * 0.01;
        let t = 0.0;
        let [x, y] = positionOf(p, t);
        d3p.moveTo(100*x, -100*y);
        for (let j = 1 ; j < 100 ; j += 1) {
          t += dt;
          [x, y] = positionOf(p, t);
          d3p.lineTo(100*x, -100*y);
        }
        d3p.closePath()
        this.planetOrbits[i] = this.planetGroup.append("path")
          .style("stroke", clock.planetColors[p])
          .style("stroke-width", 5/scale)
          .style("fill", "none")
          .attr("opacity", 0.2)
          .attr("d", d3p);
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

    this.clock.addSlave((() => this.update()).bind(this));
  }

  update() {
    if (this.svg.node().parentElement.style.display == "none") return;
    this.updateOrigin();
    let [xe, ye] = positionOf("earth", this.clock.dayNow);
    ["mercury", "venus", "mars", "jupiter", "saturn"].forEach(
      (p, i) => {
        let [x, y] = positionOf(p, this.clock.dayNow);
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
      .attr("font-family", "sans-serif")
      .attr("font-weight", "bold")
      .attr("font-size", 16)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    this.clock = clock;

    zoomButtons(width, this);
    let gap = 0.01*width;  // matches gap in zoomButtons

    this.clock.addSlave((() => this.update()).bind(this));
    if (!this.clock.elapsed) {
      this.activate(true);
    }

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
      .text("days");
    this.svg.append("text").attr("x", right).attr("y", bottom+50)
      .text("revs");

    let xgen = (d => this.x(d[0])).bind(this);
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
    let yearDragger = ((event, d) => this.yearDrag(event, d)).bind(this);
    let yearStarter = ((event, d) => this.yearDragStart(event, d)).bind(this);
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
    d3p.lineTo(x0-10, y0);
    d3p.lineTo(x0-30, y0);
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
          .attr("stroke", "#ffd")  // buttonBox color
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
      .attr("fill", "#ffd")  // buttonBox color
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
            .attr("stroke", "#ffd")  // buttonBox color
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
        .attr("stroke", "#ffd")  // buttonBox color
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
      if (this.zoomLevel != 0) {
        this.zoomLevel = 0;
        this.multiYear(true);
      }
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
      }
    } else if (this.revT) {
      this.updateSunMarker(true);
    }
  }

  activate(on) {
    if (on) {
      this.clock.addElapsed(((r, ir) => this.elapsedUpdate(r, ir)).bind(this));
    } else {
      this.clock.removeElapsed();
    }
  }

  update() {
    // if (this.svg.node().parentElement.style.display == "none") return;
  }

  zoomer(inout) {
    var level = this.zoomLevel;
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
    this.updateLinePath();
    this.updateSunMarker();
    this.updateYearBoxes();
    // Place exact year at midpoint of vertical scale.
    let ymid = 0.5*(this.revTRange[0] + this.revTRange[1]);
    let y = this.y(10*(this.yearEstimate - 365.25636) + ymid);
    this.sliderNow = y;
    this.slider.attr("transform", `translate(0, ${y - this.slider0})`);
  }

  yearDrag(event, d) {
    let [x, y] = [event.x+1.e-20, event.y];
    y += this.yDragOffset;
    let [xr, yr] = [this.x(0), this.y(this.yearEstimate)];
    let [dxr, dyr] = [this.x(1) - xr, this.y(0) - yr];
    yr += dyr;  // (xr, yr) now the point at (revs, days) = (0, 0)
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
      .attr("font-family", "sans-serif")
      .attr("font-weight", "bold")
      .attr("font-size", 16)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    this.clock = clock;

    zoomButtons(width, this);
    let gap = 0.01*width;  // matches gap in zoomButtons

    this.clock.addSlave((() => this.update()).bind(this));
    if (!this.clock.elapsed) {
      this.activate(true);
    }

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
      .text("days");
    this.svg.append("text").attr("x", right).attr("y", bottom+50)
      .text("revs");

    let xgen = (d => this.x(d[0])).bind(this);
    let dgen = (d => d[2]).bind(this);
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
    let yearDragger = ((event, d) => this.yearDrag(event, d)).bind(this);
    let yearStarter = ((event, d) => this.yearDragStart(event, d)).bind(this);
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
    d3p.lineTo(x0-10, y0);
    d3p.lineTo(x0-30, y0);
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
          .attr("stroke", "#ffd")  // buttonBox color
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
      .attr("fill", "#ffd")  // buttonBox color
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
            .attr("stroke", "#ffd")  // buttonBox color
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
        .attr("stroke", "#ffd")  // buttonBox color
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
        // zomLevel 2 is deviation from line t = t0 + (r-r0)*yearEstimate
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
    if (this.revT && t >= 0 && t <= 7310) {
      let trans = noTransition? 0 : 1000;
      let prev = this.prevUpdate;
      if (prev == undefined) {
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
      if (this.zoomLevel != 0) {
        this.zoomLevel = 0;
        this.multiYear(true);
      }
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
        // this.clock.animateTo(t0 + 5.8*this.yearEstimate, 10);
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
      this.clock.addElapsed(((r, ir) => this.elapsedUpdate(r, ir)).bind(this));
    } else {
      this.clock.removeElapsed();
    }
  }

  update() {
    // if (this.svg.node().parentElement.style.display == "none") return;
  }

  zoomer(inout) {
    var level = this.zoomLevel;
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

  multiYear(noTransition=false) {
    let trans = noTransition? 0 : 1000;
    this.x.domain([-1, 11]);
    this.y.domain([-730, 8030]);
    this.xAxis.scale(this.x);
    this.yAxis.scale(this.y);
    this.gxAxis.maybeTransition(trans).call(this.xAxis);
    this.gyAxis.maybeTransition(trans).call(this.yAxis);
    this.updateLinePath(noTransition);
    this.marsMarker.attr("display", "block");
    this.updateMarsMarker(noTransition);
    this.updateYearBoxes(noTransition);
    let y = this.y(10*this.yearEstimate);
    this.sliderNow = y;
    this.slider.attr("transform", `translate(0, ${y - this.slider0})`);
  }

  singleYear(noTransition=false) {
    let trans = noTransition? 0 : 1000;
    this.x.domain([-0.1, 1.1]);
    this.y.domain([-73, 803]);
    this.xAxis.scale(this.x);
    this.yAxis.scale(this.y);
    this.gxAxis.maybeTransition(trans).call(this.xAxis);
    this.gyAxis.maybeTransition(trans).call(this.yAxis);
    this.updateLinePath(noTransition);
    this.marsMarker.attr("display", "block");
    this.updateMarsMarker(noTransition);
    this.updateYearBoxes(noTransition);
    let y = this.y(this.yearEstimate);
    this.sliderNow = y;
    this.slider.attr("transform", `translate(0, ${y - this.slider0})`);
  }

  hiMag(noTransition=false) {
    // Adjust yearEstimate to keep slider on scale if necessary.
    if (this.yearEstimate < 684) {
      this.yearEstimate = 684;
      this.yearText.text(`Period estimate: 686.450 days`);
    } else if (this.yearEstimate > 690) {
      this.yearEstimate = 690;
      this.yearText.text(`Period estimate: 687.550 days`);
    }
    let trans = noTransition? 0 : 1000;
    this.x.domain([-0.1, 1.1]);
    let dtAvg = 0.5*(this.oppoRange[1] + this.oppoRange[0]);
    this.y.domain([dtAvg-30, dtAvg+30]);
    this.xAxis.scale(this.x);
    this.yAxis.scale(this.y);
    this.gxAxis.maybeTransition(trans).call(this.xAxis);
    this.gyAxis.maybeTransition(trans).call(this.yAxis);
    this.updateLinePath();
    this.marsMarker.attr("display", "none");
    this.updateYearBoxes();
    // Place exact year at midpoint of vertical scale.
    let ymid = 0.5*(this.oppoRange[0] + this.oppoRange[1]);
    let y = this.y(10*(this.yearEstimate - 686.97973) + ymid);
    this.sliderNow = y;
    this.slider.attr("transform", `translate(0, ${y - this.slider0})`);
  }

  yearDrag(event, d) {
    let [x, y] = [event.x+1.e-20, event.y];
    y += this.yDragOffset;
    let [xr, yr] = [this.x(0), this.y(this.yearEstimate)];
    let [dxr, dyr] = [this.x(1) - xr, this.y(0) - yr];
    yr += dyr;  // (xr, yr) now the point at (revs, days) = (0, 0)
    let factor = (this.zoomLevel > 0)? 1 : 10;
    let days = this.y.invert(y);
    if (this.zoomLevel < 2) {
      if (days < 650*factor) {
        days = 650*factor;
        y = this.y(days);
      } else if (days > 730*factor) {
        days = 730*factor;
        y = this.y(days);
      }
    } else {
      let ymid = 0.5*(this.oppoRange[0] + this.oppoRange[1]);
      days = 0.1*(days - ymid) + 686.97973;
      if (days < 684) {
        days = 684;
        y = this.y(10*(this.yearEstimate - 686.97973) + ymid);
      } else if (days > 690) {
        days = 690;
        y = this.y(10*(this.yearEstimate - 686.97973) + ymid);
      }
    }
    this.sliderNow = y;
    this.yearEstimate = days / factor;
    this.slider.attr("transform", `translate(0, ${y - this.slider0})`);
    this.yearText.text(`Period estimate: ${this.yearEstimate.toFixed(3)} days`);
    this.updateYearBoxes(true);
    this.updateLinePath(true);
    this.updateMarsMarker(true);
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
      .style("background-color", "#aaa")
      .attr("text-anchor", "middle")
      .attr("font-family", "sans-serif")
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
    this.marsYear = 686.967971;

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
        let top = -SurveyOrbits.#height / 2;
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
          .text("Select reference Mars opposition")
      });
    this.stateGroup[2] = this.svg.append("g").attr("display", "none");
    this.stateGroup[3] = this.svg.append("g").attr("display", "none");

    this.state = 0;
    this.notReady();

    // Sun marker goes on top of everything else
    this.svg.append("circle")
      .attr("stroke", "none")
      .attr("fill", clock.planetColors.sun)
      .attr("cx", 0).attr("cy", 0)
      .attr("r", 8);

    this.clock.addSlave((() => this.update()).bind(this));
  }

  stateGroupActivate(...states) {
    // <ES6: let states = Array.from(arguments);
    this.stateGroup.forEach(g => g.attr("display", "none"));
    states.forEach(i => this.stateGroup[i].attr("display", "block"));
  }

  notReady() {
    if (!this.mars.oppositions ||
        !this.mars.oppositions.found.length) {
      this.stateGroupActivate(0);
      this.state = 0;
      return true;
    } else if (this.oppositionsFound !== this.mars.oppositions.found) {
      // Oppositions changed since last activation, reset state.
      this.oppositionsFound = this.mars.oppositions.found;
      this.selectOppo();
      return false;
    } else {
      // Oppositions unchanged since last activation.
      if (this.state == 0) this.selectOppo();
      return false;
    }
  }

  selectOppo() {
    this.stateGroupActivate(1);
    this.state = 1;
    this.iRef = -1;

    let selector = (event, [d, i]) => {
      if (this.iRef == i) return;
      let sg1 = this.stateGroup[1];
      let elements;
      let change = this.iRef >= 0;
      if (change) {
        elements = ["line", "circle"].map(
          type => d3.select(sg1.selectChildren(type).nodes()[this.iRef]));
        elements[0]
          .attr("opacity", 0.25)
          .attr("x2", ([d, j]) => 2*d[0]*AU)
          .attr("y2", ([d, j]) => -2*d[1]*AU);
        elements[1]
          .style("cursor", "pointer")
          .attr("fill", "#ffd")
          .attr("stroke", "#000")
          .attr("r", 15);
      }
      this.iRef = i;
      elements = ["line", "circle"].map(
        type => d3.select(sg1.selectChildren(type).nodes()[i]));
      elements[0]
        .attr("opacity", null)
        .attr("x2", ([d, j]) => d[0]*AU)
        .attr("y2", ([d, j]) => -d[1]*AU);
      elements[1]
        .style("cursor", null)
        .attr("fill", this.clock.planetColors.mars)
        .attr("stroke", "none")
        .attr("r", 5);
      this.clock.animateTo(this.oppositionsFound[i][1], 12);
      if (!change) this.nextButton(sg1.append("g"), () => this.findEarth());
    };

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
      .attr("fill", "#ffd")
      .attr("stroke", "#000")
      .attr("stroke-width", 2)
      .attr("r", 15)
      .attr("cx", ([d, i]) => d[0]*AU)
      .attr("cy", ([d, i]) => -d[1]*AU)
      .on("click", selector);
    this.stateGroup[1].selectChildren("text")
      .data(dxyz)
      .join("text")
      .attr("pointer-events", "none")
      .attr("fill", "#ffd")
      .attr("font-size", 16)
      .attr("x", ([d, i]) => d[1][0]*AU)
      .attr("y", ([d, i]) => -d[1][1]*AU+30)
      .text(([d, i]) => dateOfDay(d[0]).getUTCFullYear());
  }

  nextButton(g, callback) {
    let [width, height] = [SurveyOrbits.#width, SurveyOrbits.#height];
    buttonBox(g.append("rect"), width/2 - 79, -height/2 + 5, 75, 28, callback);
    buttonText(g.append("text"), width/2 - 42, -height/2 + 26, "Next", 20,
               callback);
  }

  findEarth() {
    this.stateGroupActivate(1);
    this.state = 2;

  }

  activate(on) {
    if (on) {
      if (this.notReady()) {
        this.clock.disabled = false;
        return;
      }
      this.clock.disabled = true;
    } else {
      this.clock.disabled = false;
    }
  }

  update() {
    // if (this.svg.node().parentElement.style.display == "none") return;
  }
}


function buttonBox(rectSel, x, y, width, height, callback) {
  rectSel.attr("x", x).attr("y", y)
    .attr("width", width).attr("height", height)
    .attr("rx", 5)
    .style("fill", "#ffd")
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
            .style("fill", "#ffd")
            .attr("d", d3p)
            .on("click", (() => objectThis.zoomer(0)).bind(objectThis));
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
            .style("fill", "#ffd")
            .attr("d", d3p)
            .on("click", (() => objectThis.zoomer(1)).bind(objectThis));
        });
    });
}


// Oddball helper to make transition a no-op when duration is zero.
// https://github.com/d3/d3-transition/issues/93
d3.selection.prototype.maybeTransition = function(duration) {
  return duration > 0 ? this.transition().duration(duration) : this;
};

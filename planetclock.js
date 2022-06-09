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
          .style("fill", "#8bf")
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
    this.svg.append("g").call(
      g => {
        // months clock dial ring background
        g.append("circle")
          .style("fill", "none")
          .style("stroke", "#ffd")
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

    // Month labels and radial separators
    this.monthSel = this.svg.append("g").call(
      g => g.selectAll("g")
        .data(this.months)
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
              .text(d => d[2]))
    );

    // Otherwise callback will not have correct this when triggered.
    let yearSetter = (() => this.setYear()).bind(this);
    let sunDragger = ((event, d) => this.dragSun(event, d)).bind(this);
    let handToggler = ["mercury", "venus", "mars", "jupiter", "saturn"].map(
      p => (() => this.setHandVisibility(p)).bind(this));

    // Year indicator
    this.svg.append("rect").call(
      g => g
        .attr("x", -40)
        .attr("y", -0.50*rInner - 24.5)
        .attr("height", 32)
        .attr("width", 80)
        .attr("rx", 5)
        .style("fill", "#ffd")
        .style("stroke", "#000")
        .style("stroke-width", 1)
        .style("cursor", "pointer")
        .on("click", yearSetter));
    this.yearText = this.svg.append("text").call(
      g => g
        .attr("font-size", 24)
        .attr("x", 0)
        .attr("y", -0.50*rInner)
        .style("cursor", "pointer")
        .text(dateOfDay(this.dayNow).getUTCFullYear())
        .on("click", yearSetter));
    this.prevDayYear = [this.dayNow, dateOfDay(this.dayNow).getUTCFullYear()];
    this.dateText = this.svg.append("text")
      .style("pointer-events", "none")
      .attr("font-size", 14)
      .attr("x", 0)
      .attr("y", -0.42*rInner)
      .text(this.getDateText(this.dayNow));

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
          .attr("r", 10);
        g.append("text")
          .style("pointer-events", "none")
          .attr("text-anchor", "start")
          .attr("font-size", 14)
          .attr("x", xdots + 15)
          .attr("y", ytop - 1)
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
              .style("pointer-events", "none")
              .attr("text-anchor", "start")
              .attr("font-size", 14)
              .attr("x", xdots + 15)
              .attr("y", ytop + 19 + 20*i)
              .text(planet);
          });
        g.append("text")
          .style("pointer-events", "none")
          .attr("font-size", 14)
          .attr("x", 0)
          .attr("y", 20)
          .text("Earth");
      });

    // Sun position and clock hand
    this.sunHand = this.svg.append("g").call(
      g => {
        g.append("line")
          .attr("stroke", this.planetColors.sun)
          .attr("stroke-width", 3)
          .attr("x1", -rOuter)
          .attr("y1", 0.)
          .attr("x2", rOuter)
          .attr("y2", 0.);
        g.append("circle")
          .attr("stroke", "none")
          .attr("fill", this.planetColors.sun)
          .attr("cx", 0.5*(rInner+rOuter))
          .attr("cy", 0.)
          .attr("r", 10);
        g.append("rect")
          .attr("x", rInner)
          .attr("y", -(rOuter-rInner)/4)
          .attr("height", (rOuter-rInner)/2)
          .attr("width", rOuter-rInner)
          .style("pointer-events", "all")
          .style("cursor", "pointer")
          .style("fill", "none")
          .style("stroke", "none");
        g.attr("transform", "rotate(0)")  // degrees clockwise
          .call(d3.drag().on("drag", sunDragger))
          .on("touchmove", sunDragger);
      });

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
    planetGroup.append("circle")  // earth is at center
      .attr("stroke", "none")
      .attr("fill", this.planetColors.earth)
      .attr("r", 4);
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
    let [x, y] = [event.x+1.e-20, event.y];
    let theta = Math.atan2(y, x) * 180. / Math.PI
    this.sunHand.attr("transform", `rotate(${theta})`);
    this.daySky.attr("transform", `rotate(${theta})`);
    this.dayNow = timeSunAt(x, -y, this.dayNow);  // update current day
    this.updatePlanets();
    this.updateMoon();
    this.updateYear();
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
    this.dateText.text(this.getDateText(this.dayNow));
  }

  animateTo(day, step=3) {  // 3 is slow, 6 fast, 12 very fast
    day = parseFloat(day);
    if (isNaN(day) || day <= 0) {
      return;
    }
    step = parseFloat(step);
    if (isNaN(step) || step <= 0) {
      return;
    }
    this.dayStep = step;
    this.dayStop = day;
    // set interval timer for 60 frames/sec
    this.dayTimer = d3.interval((() => this.stepDay()).bind(this), 17);
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

    let [xbox, ybox] = [-width/2, -height/2];
    let dbox = 0.045*width;
    let gap = 0.01*width;
    this.svg.append("path").call(
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
          .on("click", (() => this.zoomer(0)).bind(this));
      });
    this.svg.append("path").call(
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
          .on("click", (() => this.zoomer(1)).bind(this));
      });
    let originCycler = (() => this.cycleOrigin()).bind(this);
    this.svg.append("rect").call(
      rect => {
        rect.style("fill", "#ffd")
          .style("stroke", "#000")
          .style("stroke-width", 2)
          .style("cursor", "pointer")
          .attr("x", width/2 - 150 - gap)
          .attr("y", -height/2 + gap)
          .attr("height", 28)
          .attr("width", 150)
          .attr("rx", 5)
          .on("click", originCycler);
      });
    this.originText = this.svg.append("text")
      .attr("font-size", 20)
      .attr("x", width/2 - 82)
      .attr("y", -height/2 + gap + 21)
      .style("cursor", "pointer")
      .text("heliocentric")
      .on("click", originCycler);
    this.currentOrigin = "heliocentric";

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
          .attr("opacity", "20%")
          .attr("d", d3p);
      }
    );
    this.planetOrbits[5].attr("transform", "rotate(0)");
    this.planetMarkers[6] = this.planetGroup.append("circle")  // Sun
      .attr("stroke", "none")
      .attr("fill", clock.planetColors.sun)
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 10/scale);
    let [xe, ye] = positionOf("earth", clock.dayNow);
    ["mercury", "venus", "mars", "jupiter", "saturn"].forEach(
      (p, i) => {
        let [x, y] = positionOf(p, clock.dayNow);
        this.planetMarkers[i] = this.planetGroup.append("circle")
          .attr("stroke", "none")
          .attr("fill", clock.planetColors[p])
          .attr("cx", 100*x)
          .attr("cy", -100*y)
          .attr("r", 4/scale);
        this.planetHands[i] = this.planetGroup.append("line")
          .attr("visibility", clock.planetHandVisibility[p])
          .attr("stroke", clock.planetColors[p])
          .attr("stroke-width", 3/scale)
          .attr("x1", 100*xe)
          .attr("y1", -100*ye)
          .attr("x2", 100*x)
          .attr("y2", -100*y);
      });
    this.planetHands[5] = this.planetGroup.append("line")  // Earth-Sun line
      .attr("stroke", clock.planetColors.sun)
      .attr("stroke-width", 3/scale)
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 100*xe)
      .attr("y2", -100*ye);
    this.planetMarkers[5] = this.planetGroup.append("circle")  // Earth
      .attr("stroke", "none")
      .attr("fill", clock.planetColors.earth)
      .attr("cx", 100*xe)
      .attr("cy", -100*ye)
      .attr("r", 4/scale);

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
          .attr("x1", 100*xe)
          .attr("y1", -100*ye)
          .attr("x2", 100*x)
          .attr("y2", -100*y);
        this.planetHands[i].attr("visibility",
                                 this.clock.planetHandVisibility[p]);
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
    } else if (sys == "geocentric") {
      this.updateOrigin = () => this.geocentric();
      this.planetOrbits[5].style("stroke", this.clock.planetColors.sun);
    }
    this.update();
  }

  cycleOrigin() {
    if (this.currentOrigin == "heliocentric") {
      this.currentOrigin = "geocentric";
      this.originText.text("geocentric");
    } else if (this.currentOrigin == "geocentric") {
      this.currentOrigin = "heliocentric";
      this.originText.text("heliocentric");
    }
    this.setOrigin(this.currentOrigin);
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
    this.planetOrbits.forEach(orbit => orbit.style("stroke-width", 5/scale));
    this.planetHands.forEach(hand => hand.attr("stroke-width", 3/scale));
    this.planetMarkers.slice(0,6).forEach(hand => hand.attr("r", 4/scale));
    this.planetMarkers[6].attr("r", 10/scale);
    if (this.updateOrigin()) {
      this.planetGroup.attr("transform", `scale(${scale})`);
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
      "transform",`translate(${100*xe}, ${-100*ye}) rotate(180)`);
    return false;  // planetGroup transform set
  }
}

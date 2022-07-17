/**
 * @file Computes ephermeris of planetary positions.
 * @author David H. Munro
 * @copyright David H. Munro 2022
 * @license MIT
 *
 * See [JPL web page](https://ssd.jpl.nasa.gov/planets/approx_pos.html) for
 * an explanation of the formulas employed here.
 *
 * See [Paul Schlyter's page](https://www.stjarnhimlen.se/comp/ppcomp.html)
 * for the model of the Moon implemented here.  Note that Schlyter uses a
 * time origin of 1999 Dec 31 00:00 UTC, which is day=-1.5 in the J2000 time
 * origin of 2000 Jan 1 12:00 UTC used in the JPL formulas.
 * Only the Sun and Moon models are used here.
 */

/**
 * Convert Date to Julian day relative to J2000.
 * To get conventional Julian day number, add 2451545.0.
 *
 * @param {Date|string|Array<number>} date - Either a Date object or
 *     a string accepted by the Date constructor, or an array
 *     of numeric arguments to the Date constructor [year, month, day
 *     ...].  Unless the string specifies a timezone explicitly, this
 *     will be interpreted as a local time.
 * @param {bool} utcAdj - If you want the date to be shifted from local
 *     time to UTC by adding the current timezone offset, specify
 *     utcAdj as true.  A javascript Date object is always in UTC and
 *     contains no timezone information.  However, the Date constructor
 *     provides no easy way to specify a timezone other than local time
 *     (unless you pass it a string argument), so this parameter is
 *     provided to allow you to specify an Array<number> in UTC.
 *
 * @return {number} Julian day relative to J2000 (JD 2451545.0).
 */
function dayOfDate(date, utcAdj=false) {
  if (Array.isArray(date)) {
    date = new Date(...date);
  } else if (typeof date === 'string') {
    date = new Date(date);
  }
  // Convert from milliseconds to days and shift the origin from
  // midnight Jan 1 1970 to noon Jan 1 2000 (the J2000 origin).
  let day = date.getTime()/86400000. - 10957.5;
  if (utcAdj) {
    day -= date.getTimezoneOffset() / 1440.;  // offset > 0 for west lon
  }
  return day;
}

/**
 * Convert Julian day relative to J2000 to Date object.
 * J2000 begins at Julian day 2451545.0.
 *
 * @param {day} day - Julian day relative to J2000 (JD 2451545.0).
 *
 * @return {Date}
 */
function dateOfDay(day) {
  return new Date((day + 10957.5) * 86400000.);
}

/**
 * Return J2000 ecliptic direction of planet for a given time.
 *
 * @param {string} planet - name (mercury, venus, earth, mars, jupiter,
 *     saturn, uranus, or neptune).  Also accepts "sun", which gives the
 *     same result as "earth" because the direction from Earth to itself
 *     is undefined.
 * @param {number} day - Time in Julian days relative to J2000 (that is
 *     Julian day - 2451545.0).  Use dayOfDate() to convert from Date.
 * @param {bool} [norm3] - true to return result as 3D unit vector,
 *     default false returns 2D unit vector plus latitude in radians
 *
 * @return {Array<number>} [cos(longitude), sin(longitude), latitude].
 */
function directionOf(planet, day, norm3) {
  day = parseFloat(day);
  if (isNaN(day)) {
    return undefined;
  }
  // Use ssModel1 from 1800 to 2050, otherwise ssModel2
  const ssModel = (day<-73048.0 || day>18263.0)? ssModel2 : ssModel1;
  return ssModel.direction(planet, day, norm3);
}

/**
 * Return J2000 ecliptic position of planet for a given time.
 *
 * @param {string} planet - name (mercury, venus, earth, mars, jupiter,
 *     saturn, uranus, or neptune).
 * @param {number} day - Time in Julian days relative to J2000 (that is
 *     Julian day - 2451545.0).  Use dayOfDate() to convert from Date.
 *
 * @return {Array<number>} ecliptic [x, y, z] in au (astronomical units).
 */
function positionOf(planet, day) {
  day = parseFloat(day);
  if (isNaN(day)) {
    return undefined;
  }
  // Use ssModel1 from 1800 to 2050, otherwise ssModel2
  const ssModel = (day<-73048.0 || day>18263.0)? ssModel2 : ssModel1;
  return ssModel.xyz(planet, day);
}

/**
 * Return time Sun appears in direction (x, y) within six months of nearDay.
 * At the returned time, the direction of the Sun will be parallel to (x, y)
 * to within about 1 arc minute.
 *
 * @param {number} x - Unnormalized x coordinate in J2000 ecliptic plane.
 * @param {number} y - Unnormalized y coordinate in J2000 ecliptic plane.
 * @param {number} nearDay - as Julian day relative to J2000.
 *
 * @return {number} time as Julian day relative to J2000.
 */
function timeSunAt(x, y, nearDay) {
  [x, y, nearDay] = [x, y, nearDay].map(v => parseFloat(v));
  if (isNaN(x + y + nearDay)) {
    return undefined;
  }
  // Use ssModel1 from 1800 to 2050, otherwise ssModel2
  const ssModel = (nearDay<-73048.0 || nearDay>18263.0)? ssModel2 : ssModel1;
  return ssModel.timeSunAt(x, y, nearDay);
}

/**
 * Return orientation of ecliptic on a given day.
 *
 * @param {number} day - as Julian day relative to J2000.
 *
 * @return {Array<number>} [cnti, -snti], z = -snti*x + cnti*y
 */
function eclipticOrientation(day) {
  day = parseFloat(day);
  if (isNaN(day)) {
    return undefined;
  }
  // Use ssModel1 from 1800 to 2050, otherwise ssModel2
  const ssModel = (day<-73048.0 || day>18263.0)? ssModel2 : ssModel1;
  return ssModel.earthInclination(day);
}

/**
 * Find x such that f(x) = 0, given bracketing initial x values.
 * The initial values x0 and x1 must satisfy f(x0)*f(x1) <= 0.
 * You can optionally pass [x0, f(x0)] and [x1, f(x1)] to avoid
 * computing f for the initial points.
 *
 * @param {function} f - function to be solved
 * @param {number | Array<number>} xy0 - x0 or [x0, f(x0)]
 * @param {number | Array<number>} xy1 - x1 or [x1, f(x1)]
 * @param {number} [tol] - absolute tolerance for result x (default 1.e-6)
 * @param {number} [itmax] - maximum number of iterations (default 20)
 *
 * @return {number} value of x (within tol) where f(x) = 0
 */
function zbrent(f, xy0, xy1, tol=1.0e-5, itmax=25) {
  // from Numerical Recipes, section 9.3 Van Wijngaarden-Dekker-Brent Method
  // - same as netlib zeroin.f with minor rearrangements (same variable names)
  let [a, fa] = Array.isArray(xy0)? xy0 : [xy0, f(xy0)];
  let [b, fb] = Array.isArray(xy1)? xy1 : [xy1, f(xy1)];
  if (fa * fb > 0) return undefined;
  const [abs, min] = [Math.abs, Math.min];
  let [c, fc] = [b, fb];
  let d, e, xm, p, q, r, s;
  let it = 0;
  for (it=1 ; it<=itmax ; it+=1) {
    if (fb*fc > 0) {
      [c, fc] = [a, fa];
      e = d = b - a;
    }
    if (abs(fc) < abs(fb)) {
      [a, b, c] = [b, c, b];
      [fa, fb, fc] = [fb, fc, fb];
    }
    xm = 0.5*(c - b);
    if (abs(xm) <= tol || fb == 0) break;
    if (abs(e) >= tol && abs(fa) > abs(fb)) {
      s = fb / fa;
      if (a == c) {  // only two points, try linear interpolation
        p = 2 * xm * s;
        q = 1 - s;
      } else {  // try inverse quadratic interpolation
        [q, r] = [fa / fc, fb / fc];
        p = s*(2*xm*q*(q-r) - (b-a)*(r-1));
        q = (q-1) * (r-1) * (s-1);
      }
      if (p > 0) q = -q;
      else p = -p;
      if (2*p < min(3*xm*q - abs(tol*q), abs(e*q))) {
        [e, d] = [d, p / q];
      } else {
        e = d = xm;  // interpolation failed, use bisection
      }
    } else {
      e = d = xm;  // bounds decreasing too slowly, use bisection
    }
    [a, fa] = [b, fb];  // a becomes previous best guess
    if (abs(d) >= tol) b += d;
    else if (xm > 0) b += tol;
    else b -= tol;
    fb = f(b);
  }
  return b;
}

/**
 * Class to detect and refine planetary oppositions.
 */
class OppositionDetector {
  constructor(planet, day) {
    this.planet = planet;
    this.found = [];
    let initial = this.collectDay(day);
    initial.unshift(0);
    this.range = [initial, initial];
  }

  collectDay(day) {
    let xyz = positionOf(this.planet, day);
    let xyze = positionOf("earth", day);
    let [x, y] = xyz;
    let [xe, ye] = xyze;
    return [day, xyz, xyze, x*ye - y*xe, x*xe + y*ye];
  }

  next(day) {
    let front = day <= this.range[1][1];
    if (front && day >= this.range[0][1]) return [false];
    let prev = this.range[front? 0 : 1];
    let current = this.collectDay(day);
    let [cross, crossp] = [current[3], prev[4]];
    let [dot, dotp] = [current[4], prev[5]];
    // (dot, cross) are geocentric direction vector for planet
    // compute change since prev and prepend revs to current
    current.unshift(prev[0]);
    current[0] += this.deltaRevs(prev, current);
    this.range[front? 0 : 1] = current;
    if (cross*crossp > 0 || dot < 0 || dotp < 0) {
      return [false, current];
    }
    // An opposition (or inferior conjunction) is between prev and current.
    // Use Brent's method to find it by finding zero of cross(day).
    let dayp = prev[1];
    let dayOpp = zbrent((d => this.collectDay(d)[3]).bind(this),
                        [dayp, crossp], [day, cross]);
    let opposition = this.collectDay(dayOpp);
    opposition.unshift(prev[0]);
    opposition[0] += this.deltaRevs(prev, opposition);
    if (front) {  // keep found list sorted
      this.found.unshift(opposition);
    } else {
      this.found.push(opposition);
    }
    return [true, opposition];
  }

  deltaRevs(prev, current) {
    let [xp, yp] = prev[2].slice(0,2).map((x, i) => x - prev[3][i]);
    let [x, y] = current[2].slice(0,2).map((x, i) => x - current[3][i]);
    let drevs = Math.atan2(xp*y - yp*x, xp*x + yp*y) / (2 * Math.PI);
    const twoPI = Math.PI*2;
    return drevs;
  }
}

/**
 * Solar system model class with constructor that accepts cut-and-pasted
 * JPL Web page tables.
 */
class SolarSystem {
  constructor(table, auxTable) {
    let params = SolarSystem.readRows(table);
    if (auxTable !== undefined) {
      let aux = SolarSystem.readRows(auxTable);
      Object.keys(aux).forEach(key => params[key].concat([aux[key]]));
    } else if (params.moon != undefined) {
      // This is ssSchlyter, adjust parameters to agree with JPL tables.
      Object.keys(params).forEach(key => {
        let [values, rates] = params[key];
        // (ma, aper, nlon) --> (mlon, plon, nlon)
        values[4] += values[5];
        rates[4] += rates[5];
        values[3] += values[4];
        rates[3] += rates[4];
        // JPL time origin is 1.5 days later than Schlyter time origin.
        values = values.map((v, i) => v + 1.5*rates[i]);
        // JPL rates are per Julian century, Schlyter rates are per day.
        rates = rates.map(r => 36525. * r);
        params[key] = [values, rates];
      });
    }
    this.params = params;
  }

  /**
   * Return normalized direction in ecliptic and angle out of ecliptic.
   *
   * @param {string} planet - name (mercury, venus, earth, mars, jupiter,
   *     saturn, uranus, or neptune).  Here "earth" returns direction to sun.
   * @param {number} day - Julian day relative to J2000 (offset 2451545.0).
   * @param {bool} [norm3] - true to return result as 3D unit vector,
   *     default false returns 2D unit vector plus latitude in radians
   *
   * @return {Array<number>} (cos(longitude), sin(longitude), latitude)
   */
  direction(planet, day, norm3=false) {
    let [x, y, z] = this.xyzRel(planet, day);
    let recl = Math.sqrt(norm3? x**2 + y**2 + z**2 : x**2 + y**2);
    return [x/recl, y/recl, norm3? z/recl : Math.atan2(z, recl)];
  }

  /**
   * Return J20000 ecliptic (x, y, z) coordinates (au), relative to Earth.
   *
   * @param {string} planet - name (mercury, venus, earth, mars, jupiter,
   *     saturn, uranus, or neptune).  Here "earth" would always give [0, 0, 0],
   *     so instead returns position for sun.  Also accepts "sun".
   * @param {number} day - Julian day relative to J2000 (offset 2451545.0).
   *
   * @return {Array<number>} (x, y, z) ecliptic coordinates relative to Earth.
   */
  xyzRel(planet, day) {
    let xyze;
    if (this.params.earth !== undefined) {
      xyze = this.xyz("earth", day);
      if (planet == "earth" || planet == "sun") {
        return xyze.map(x => -x);
      }
    } else {
      xyze = this.xyz("sun", day).map(x => -x);
      if (planet == "earth" || planet == "sun") {
        return xyze;
      }
    }
    let xyz = this.xyz(planet, day);
    return xyz.map((x, i) => x - xyze[i]);
  }

  /**
   * Return J20000 ecliptic (x, y, z) coordinates (au), relative to the Sun.
   *
   * @param {string} planet - name (mercury, venus, earth, mars, jupiter,
   *     saturn, uranus, or neptune).
   * @param {number} day - Julian day relative to J2000 (offset 2451545.0).
   *
   * @return {Array<number>} (x, y, z) J2000 ecliptic coordinates in au.
   */
  xyz(planet, day) {
    let [cday, xyz] = this.cached_xyz[planet];
    if (day === cday) {
      return xyz;
    }
    const t = day / 36525.;  // Julian centuries past J2000.0.
    const [values, rates, aux] = this.params[planet];
    const a = values[0] + rates[0]*t;
    let [x, y, z] = this.#xyzEcliptic(t, values, rates, aux);
    xyz = [a*x, a*y, a*z];
    this.cached_xyz[planet] = [day, xyz];
    return xyz;
  }

  cached_xyz = {mercury: [""], venus: [""], earth: [""], mars: [""],
                jupiter: [""], saturn: [""], uranus: [""], neptune: [""],
                sun: [""], moon: [""]};

  /* Common code shared by xyz() and timeSunAt() methods computes
   * unscaled point (x, y) of planetary position projected into
   * ecliptic plane at time t.
   *
   * The six orbital parameters in values and rates are:
   * a = ellipse semi-major axis
   * e = eccentricity
   * incl = orbital inclination
   * mlon = mean longitude
   * plon = longitude of perihelion
   * nlon = longitude of ascending node
   */
  #xyzEcliptic(t, values, rates, aux) {
    const [sqrt, sin, cos, abs] = [Math.sqrt, Math.sin, Math.cos, Math.abs];
    let [e, incl, mlon, plon, nlon] = values.slice(1).map((x, i) =>
                                                          x + rates[i+1]*t);
    let ma = mlon - plon  // mean anomaly
    if (aux !== undefined) {  // outer planet correction to ma for Model2
      const ft = aux[3]*t
      ma += aux[0]*t*t + aux[1]*cos(ft) + aux[2]*sin(ft);
    }
    // ee = eccentric anomaly, compute from mean anomaly by Newton iteration
    let ee = ma + e*sin(ma + e*sin(ma));  // initial guess
    let [cee, see] = [cos(ee), sin(ee)]
    let dma = ma - (ee - e*see);  // find ee so this equals 0.
    while (abs(dma) > 1.e-9) {
      ee += dma / (1. - e*cee);
      [cee, see] = [cos(ee), sin(ee)]
      dma = ma - (ee - e*see);
    }
    let x = cee - e;
    let y = sqrt(1. - e*e) * see;
    let aper = plon - nlon  // argument of perihelion
    let [cw, sw] = [cos(aper), sin(aper)];
    let [cn, sn] = [cos(nlon), sin(nlon)];
    let [ci, si] = [cos(incl), sin(incl)];
    let [cisn, cicn] = [ci*sn, ci*cn];
    let z;
    [x, y, z] = [(cw*cn - sw*cisn)*x - (sw*cn + cw*cisn)*y,
                 (cw*sn + sw*cicn)*x - (sw*sn - cw*cicn)*y,
                 (sw*x + cw*y)*si];
    return [x, y, z, e, ee, see, ma, aper, nlon];
  }

  earthInclination(day) {
    const t = day / 36525.;  // Julian centuries past J2000.0.
    const [values, rates] = this.params["earth"];
    let [incl, mlon, plon, nlon] = values.slice(2).map((v, i) =>
                                                       v + rates[i+2]*t);
    let ti = Math.tan(incl);
    return [Math.cos(nlon)*ti, -Math.sin(nlon)*ti];
  }

  /**
   * Return time Sun was in direction of (x, y) nearest to nearDay.
   * That is, the returned time is within about six months of nearDay.
   * The position of the Sun at the returned time is within 1 arc minute
   * of the input (x, y) direction.
   *
   * @param {number} x - unnormalized Sun coordinate in ecliptic plane.
   * @param {number} y - unnormalized Sun coordinate in ecliptic plane.
   * @param {number} nearDay - Julian day relative to J2000 (offset 2451545.0).
   *
   * @return {number} Julian day relative to J2000 when Sun crossed (x, y).
   */
  timeSunAt(x, y, nearDay) {
    const [sin, atan2, abs] = [Math.sin, Math.atan2, Math.abs];
    let planet;
    if (this.params.moon == undefined) {
      x = -x;  // convert from Sun direction to Earth direction
      y = -y;
      planet = "earth"
    } else {
      planet = "sun"
    }
    let t = nearDay / 36525.;  // Julian centuries past J2000.0.
    const [values, rates] = this.params[planet];
    const freq = rates[3];  // approximate d(ma)/dt (rates[4] cancels)
    let dma = 1.0;
    while (abs(dma) > 0.0003) {  // about 1 arc minute precision
      // loop generally converges in 3 passes
      let [xp, yp, , e, ee, see] = this.#xyzEcliptic(t, values, rates);
      let dee = atan2(xp*y - yp*x, xp*x + yp*y);  // angle from (xp,yp) to (x,y)
      dma = dee - e*(sin(ee+dee) - see);
      t += dma / freq;
    }
    return t * 36525.;
  }

  moon(day) {
    let [sqrt, atan2, cos, sin] = [Math.sqrt, Math.atan2, Math.cos, Math.sin];
    const t = day / 36525.;  // Julian centuries past J2000.0.
    let [values, rates] = this.params["moon"];
    const a = values[0] + rates[0]*t;
    let [mlon, plon, nlon] = values.slice(3).map((x, i) => x + rates[i+3]*t);
    let [mam, apm, nlm, mlm] = [mlon - plon, plon - nlon, nlon, mlon];
    let aper = plon - nlon  // argument of perihelion
    let [x, y, z] = this.#xyzEcliptic(t, values, rates);
    [x, y, z] = [a*x, a*y, a*z];
    let r = x*x + y*y;
    let lon = atan2(y, x);
    let lat = atan2(z, sqrt(r));
    r = sqrt(r + z*z);
    [values, rates] = this.params["sun"];
    [mlon, plon, nlon] = values.slice(3).map((x, i) => x + rates[i+3]*t);
    let [mas, aps, nls, mls] = [mlon - plon, plon - nlon, nlon, mlon];
    let [mel, alat] = [mlm - mls, mlm - nlm];
    let dlon = -1.274*sin(mam - 2*mel) + 0.658*sin(2*mel) - 0.186*sin(mas)
      - 0.059*sin(2*mam - 2*mel) - 0.057*sin(mam - 2*mel + mas)
      + 0.053*sin(mam + 2*mel) + 0.046*sin(2*mel - mas)
      + 0.041*sin(mam - mas) - 0.035*sin(mel) - 0.031*sin(mam + mas)
      - 0.015*sin(2*alat - 2*mel) + 0.011*sin(mam - 4*mel);
    let dlat = -0.173*sin(alat - 2*mel) - 0.055*sin(mam - alat - 2*mel)
      - 0.046*sin(mam + alat - 2*mel) + 0.033*sin(alat + 2*mel)
      + 0.017*sin(2*mam + alat);
    r += -0.58*cos(mam - 2*mel) - 0.46*cos(2*mel);  // assume earth radii unit
    lon += dlon * Math.PI/180.
    lat += dlat * Math.PI/180.
    return [cos(lon), sin(lon), lat, r];
  }

  static readRows(table) {
    const toRad = Math.PI / 180.;
    let values = table.replace("EM Bary", "Earth").split("\n")
        .slice(1, -1).map(c => c.match(/[^ ]+/g));
    if (values.length > 9) {  // table of orbital elements and their weights
      let rates = values.filter((x, i) => i%2 === 1).map(
        r => r.map((x, i) => Number(x)*(i>1? toRad : 1.)));
      let names = values.filter((x, i) => i%2 === 0);
      values = names.map(r => r.slice(1).map(
        (x, i) => Number(x)*(i>1? toRad : 1.)));
      names = names.map(r => r[0].toLowerCase());
      return Object.fromEntries(names.map((n, i) => [n, [values[i], rates[i]]]));
    } else {  // auxilliary table of outer planet corrections for ssModel2
      let names = values.map(r => r[0].toLowerCase());
      values = values.map(r => r.slice(1).map(x => Number(x) * toRad));
      return Object.fromEntries(names.map((n, i) => [n, values[i]]));
    }
  }
}

// JPL columns are:  a, e, incl, mlon, plon, nlon  and rates are per J-century
const ssModel1 = new SolarSystem(`
Mercury   0.38709927      0.20563593      7.00497902      252.25032350     77.45779628     48.33076593
          0.00000037      0.00001906     -0.00594749   149472.67411175      0.16047689     -0.12534081
Venus     0.72333566      0.00677672      3.39467605      181.97909950    131.60246718     76.67984255
          0.00000390     -0.00004107     -0.00078890    58517.81538729      0.00268329     -0.27769418
EM Bary   1.00000261      0.01671123     -0.00001531      100.46457166    102.93768193      0.0
          0.00000562     -0.00004392     -0.01294668    35999.37244981      0.32327364      0.0
Mars      1.52371034      0.09339410      1.84969142       -4.55343205    -23.94362959     49.55953891
          0.00001847      0.00007882     -0.00813131    19140.30268499      0.44441088     -0.29257343
Jupiter   5.20288700      0.04838624      1.30439695       34.39644051     14.72847983    100.47390909
         -0.00011607     -0.00013253     -0.00183714     3034.74612775      0.21252668      0.20469106
Saturn    9.53667594      0.05386179      2.48599187       49.95424423     92.59887831    113.66242448
         -0.00125060     -0.00050991      0.00193609     1222.49362201     -0.41897216     -0.28867794
Uranus   19.18916464      0.04725744      0.77263783      313.23810451    170.95427630     74.01692503
         -0.00196176     -0.00004397     -0.00242939      428.48202785      0.40805281      0.04240589
Neptune  30.06992276      0.00859048      1.77004347      -55.12002969     44.96476227    131.78422574
          0.00026291      0.00005105      0.00035372      218.45945325     -0.32241464     -0.00508664
`);

const ssModel2 = new SolarSystem(`
Mercury   0.38709843      0.20563661      7.00559432      252.25166724     77.45771895     48.33961819
          0.00000000      0.00002123     -0.00590158   149472.67486623      0.15940013     -0.12214182
Venus     0.72332102      0.00676399      3.39777545      181.97970850    131.76755713     76.67261496
         -0.00000026     -0.00005107      0.00043494    58517.81560260      0.05679648     -0.27274174
EM Bary   1.00000018      0.01673163     -0.00054346      100.46691572    102.93005885     -5.11260389
         -0.00000003     -0.00003661     -0.01337178    35999.37306329      0.31795260     -0.24123856
Mars      1.52371243      0.09336511      1.85181869       -4.56813164    -23.91744784     49.71320984
          0.00000097      0.00009149     -0.00724757    19140.29934243      0.45223625     -0.26852431
Jupiter   5.20248019      0.04853590      1.29861416       34.33479152     14.27495244    100.29282654
         -0.00002864      0.00018026     -0.00322699     3034.90371757      0.18199196      0.13024619
Saturn    9.54149883      0.05550825      2.49424102       50.07571329     92.86136063    113.63998702
         -0.00003065     -0.00032044      0.00451969     1222.11494724      0.54179478     -0.25015002
Uranus   19.18797948      0.04685740      0.77298127      314.20276625    172.43404441     73.96250215
         -0.00020455     -0.00001550     -0.00180155      428.49512595      0.09266985      0.05739699
Neptune  30.06952752      0.00895439      1.77005520      304.22289287     46.68158724    131.78635853
          0.00006447      0.00000818      0.00022400      218.46515314      0.01009938     -0.00606302
`, `
Jupiter   -0.00012452    0.06064060   -0.35635438   38.35125000
Saturn     0.00025899   -0.13434469    0.87320147   38.35125000
Uranus     0.00058331   -0.97731848    0.17689245    7.67025000
Neptune   -0.00041348    0.68346318   -0.10162547    7.67025000
`);

// Schlyter columns are:  a, e, incl, ma, aper, nlon and rates are per day
const ssSchlyter = new SolarSystem(`
Sun      1.000000   0.016709  0.0000    356.0470      282.9404      0.00000
         0.000000  -1.151e-9  0.0000    0.9856002585  4.70935E-5    0.00000
Moon     60.2666    0.054900  5.1454    115.3654      318.0634      125.1228
         0.00000    0.000000  0.0000    13.0649929509 0.1643573223 -0.0529538083
Mercury  0.387098   0.205635  7.0047    168.6562      29.1241       48.3313
         0.000000   5.59E-10  5.00E-8   4.0923344368  1.01444E-5    3.24587E-5
Venus    0.723330   0.006773  3.3946    48.0052       54.8910       76.6799
         0.000000  -1.302E-9  2.75E-8   1.6021302244  1.38374E-5    2.46590E-5
Mars     1.523688   0.093405  1.8497    18.6021       286.5016      49.5574
         0.000000   2.516E-9 -1.78E-8   0.5240207766  2.92961E-5    2.11081E-5
Jupiter  5.20256    0.048498  1.3030    19.8950       273.8777      100.4542
         0.000000   4.469E-9 -1.557E-7  0.0830853001  1.64505E-5    2.76854E-5
Saturn   9.55475    0.055546  2.4886    316.9670      339.3939      113.6634
         0.000000  -9.499E-9 -1.081E-7  0.0334442282  2.97661E-5    2.38980E-5
Uranus   19.18171   0.047318  0.7733    142.5905      96.6612       74.0005
        -1.55E-8    7.45E-9   1.9E-8    0.011725806   3.0565E-5     1.3978E-5
Neptune  30.05826   0.008606  1.7700    260.2471      272.8461      131.7806
         3.313E-8   2.15E-9  -2.55E-7   0.005995147  -6.027E-6      3.0173E-5
`);

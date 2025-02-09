var depthSlider;
var revealSlider;
var speedSlider;
var colorSliders;


var config;
var curTime;
var TIME_OFFSET = 0;

const MAX_DEPTH = 12;
const FRAME_RATE = 60;
const depthToShapes = {};

let starsLeft = [[30, 30]]; // stores coords from center
let starsRight = [[30, 30]];
let sunstars = [[30, 30]];
let sunstartips = [[30, 30]];

p5.disableFriendlyErrors = true;

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function setup() {
  createCanvas(displayWidth,displayHeight)

  depthSlider = createSlider(1,MAX_DEPTH,7);
  depthSlider.parent(document.getElementById('depth'))
  let curReveal = getRandomInt(1,10)
  revealSlider = createSlider(1,10,curReveal);
  revealSlider.parent(document.getElementById('reveal'))
  speedSlider = createSlider(2,10,3);
  speedSlider.parent(document.getElementById('speed'))


  config = {}
  colorSliders = initializeColorSliders()
  button = createButton('Reset');
  button.parent(document.getElementById('reset'))
  button.mousePressed( () => TIME_OFFSET = curTime)
  document.addEventListener('keypress', (e) => {
    if (e.key === 'r') TIME_OFFSET = curTime;
  })
  frameRate(FRAME_RATE)

  const center = createVector(width/2,height/2);
  // const length = width*2/3;
  const length = height / 2;
  const halves = halfShapes(initializeSun(center,length));
  depthToShapes[0] = halves;
}
function draw() {
  clear()
  background('black');
  strokeWeight(1/(2*depthSlider.value()))
  curTime = frameCount / FRAME_RATE;
  const shapes = shapesAtDepth(depthToShapes,depthSlider.value())
  const length = shapes.length;
  for (let i = 0; i < length; i++) {
    const shape = shapes[i];
    if (isVisible(shape.tip(),curTime-TIME_OFFSET)) shape.render()
  }

  if (starsLeft.length != 0) {
    starsLeft.forEach(e => {
      fill('green');
      ellipse(e[0] + width / 2, e[1] + height / 2, 10, 10);
    })
  }
  if (starsRight.length != 0) {
    starsRight.forEach(e => {
      fill('red');
      ellipse(e[0] + width / 2, e[1] + height / 2, 10, 10);
    })
  }
  if (sunstars.length != 0) {
    sunstars.forEach(e => {
      fill('orange');
      ellipse(e[0] + width / 2, e[1] + height / 2, 10, 10);
    })
  }
  if (sunstartips.length != 0) {
    sunstartips.forEach(e => {
      fill('blue');
      ellipse(e[0] + width / 2, e[1] + height / 2, 10, 10);
    })
  }
}

function mousePressed() {
  const aboveHalfShapes = shapesAtDepth(depthToShapes,depthSlider.value() - 1);
  const EPSILON = 0.01; // 許容誤差

  // 角度計算のために明示的にRADIANSモードに設定
  angleMode(RADIANS);

  // stars
  const aboveHalfKites = aboveHalfShapes.filter(e => e instanceof HalfKite);

  // tipの座標でグループ化
  const tailGroups = {};
  aboveHalfKites.forEach(halfKite => {
    const tail = halfKite.kite.tail;
    
    // 既存のグループの中から近い座標を探す
    let foundGroup = Object.keys(tailGroups).find(key => {
      const [existingX, existingY] = key.split(',').map(Number);
      return Math.abs(existingX - tail.x) < EPSILON && 
             Math.abs(existingY - tail.y) < EPSILON;
    });

    // 近い座標が見つからなければ新しいグループを作成
    if (!foundGroup) {
      foundGroup = `${tail.x},${tail.y}`;
      tailGroups[foundGroup] = [];
    }
    
    tailGroups[foundGroup].push(halfKite);
  });

  // 10個以上のグループを左右に分類
  const starsLeftTemp = [];
  const starsRightTemp = [];
  const ANGLE_THRESHOLD = 5; // 真左右からの許容角度

  Object.entries(tailGroups)
    .filter(([_, kites]) => kites.length >= 10)
    .forEach(([key, kites]) => {
      const [x, y] = key.split(',').map(Number);
      
      let hasRight = false;
      let hasLeft = false;
      
      kites.forEach(halfKite => {
        // heading()はラジアンを返すので、度数に変換
        const angle = degrees(halfKite.kite.vector.heading());
        
        // 真右(0度)との差が閾値以内
        if (Math.abs(angle) < ANGLE_THRESHOLD) {
          hasRight = true;
        }
        // 真左(180度/-180度)との差が閾値以内
        if (Math.abs(Math.abs(angle) - 180) < ANGLE_THRESHOLD) {
          hasLeft = true;
        }
      });

      if (hasRight) {
        starsRightTemp.push([x - width/2, y - height/2]);
      } else if (hasLeft) {
        starsLeftTemp.push([x - width/2, y - height/2]);
      }
    });

  starsLeft = starsLeftTemp;
  starsRight = starsRightTemp;

  // sunstars
  const aboveHalfDarts = aboveHalfShapes.filter(e => {return e instanceof HalfDart});
  
  // tipの座標でグループ化
  const tipGroups = {};
  aboveHalfDarts.forEach(halfDart => {
    const tip = halfDart.tip();
    
    // 既存のグループの中から近い座標を探す
    let foundGroup = Object.keys(tipGroups).find(key => {
      const [existingX, existingY] = key.split(',').map(Number);
      return Math.abs(existingX - tip.x) < EPSILON && 
             Math.abs(existingY - tip.y) < EPSILON;
    });

    // 近い座標が見つからなければ新しいグループを作成
    if (!foundGroup) {
      foundGroup = `${tip.x},${tip.y}`;
      tipGroups[foundGroup] = [];
    }
    
    tipGroups[foundGroup].push(halfDart);
  });

  // 10個以上のグループの座標を抽出
  const largeTipGroups = Object.entries(tipGroups)
    .filter(([_, darts]) => darts.length >= 10)
    .map(([key, _]) => {
      const [x, y] = key.split(',').map(Number);
      return createVector(x, y);
    });

  sunstars = largeTipGroups.map(v => [v.x - width/2, v.y - height/2]);

  // sunstartips
  const vec = aboveHalfKites[0].kite.vector;
  const MIN_DISTANCE = vec.mag() * 1.5; // starsからの最小距離

  const potentialTips = [];
  sunstars.forEach(sunstar => {
    // sunstarの位置に対応するHalfDartを見つける
    const matchingHalfDarts = aboveHalfDarts.filter(halfDart => {
      const tip = halfDart.tip();
      return Math.abs(tip.x - (sunstar[0] + width/2)) < EPSILON && 
             Math.abs(tip.y - (sunstar[1] + height/2)) < EPSILON;
    });
    console.log(matchingHalfDarts)

    // 各HalfDartのpointFromLeftSideを取得
    matchingHalfDarts.forEach(halfDart => {
      const leftPoint = halfDart.dart.pointFromLeftSide;
      
      // starsからの距離をチェック
      let isFarEnough = true;
      for (let star of [...starsLeft, ...starsRight]) {
        const distance = dist(leftPoint.x, leftPoint.y, star[0] + width/2, star[1] + height/2);
        if (distance < MIN_DISTANCE) {
          isFarEnough = false;
          break;
        }
      }

      if (isFarEnough) {
        potentialTips.push([leftPoint.x - width/2, leftPoint.y - height/2]);
      }
    });
  });

  console.log('sunstartips coordinates', potentialTips);
  sunstartips = potentialTips;

  // CSVファイルとしてダウンロード
  function downloadCSV(filename, content) {
    const blob = new Blob(['x,y\n' + content], { type: 'text/csv' });
    const elem = window.document.createElement('a');
    elem.href = window.URL.createObjectURL(blob);
    elem.download = filename;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
  }

  // // 各データをCSVとしてダウンロード
  downloadCSV('stars_left.csv', 
    starsLeft.map(coord => `${coord[0]/(height/2).toFixed(8)},${coord[1]/(height/2).toFixed(8)}`).join('\n'));

  downloadCSV('stars_right.csv', 
    starsRight.map(coord => `${coord[0]/(height/2).toFixed(8)},${coord[1]/(height/2).toFixed(8)}`).join('\n'));
  
  downloadCSV('sunstars.csv',
    sunstars.map(coord => `${coord[0]/(height/2).toFixed(8)},${coord[1]/(height/2).toFixed(8)}`).join('\n'));
  
  downloadCSV('sunstartips.csv',
    sunstartips.map(coord => `${coord[0]/(height/2).toFixed(8)},${coord[1]/(height/2).toFixed(8)}`).join('\n'));

  // 他の処理のためにDEGREESモードに戻す
  angleMode(DEGREES);
}

function initializeStar(center,length) {
  angleMode(DEGREES);
  const shapes = [];
  for (let i = 1; i <= 5; i++) {
    const angle = (360 / 5) * i;
    const newVec = vectorFromMagAndAngle(length,angle)
    newVec.rotate(angle)
    shapes.push(new Dart(center,newVec));
  }
  return shapes;
}
function initializeSun(center,length) {
  console.log("initializing with sun")
  angleMode(DEGREES);
  const shapes = [];
  for (let i = 1; i <= 5; i++) {
    const angle = (360 / 5) * i;
    const newVec = vectorFromMagAndAngle(length,angle)
    newVec.rotate(angle)
    shapes.push(new Kite(p5.Vector.add(center,newVec),p5.Vector.mult(newVec,-1)));
  }
  return shapes;
}
function initializeKing(center,length) {
  angleMode(DEGREES);
}
function halfShapes(shapes) {
  const arr = [];
  shapes.forEach( (shape) => {
    arr.push(shape.half(LEFT));
    arr.push(shape.half(RIGHT));
  })
  return arr;
}
function shapesAtDepth(map, depth) {
  if (Boolean(map[depth])) return map[depth];
  const prevShapes = shapesAtDepth(map,depth-1);
  const newDepth = [];
  prevShapes.forEach( (shape) => {
    shape.subdivide().forEach( (subShape) => {
      newDepth.push(subShape);
    });
  });
  map[depth] = newDepth;
  return newDepth;
}
function timeSubmerged(point,func) {
  const newPoint = createVector(point.x/width,point.y/height);
  const fracTime = func(newPoint);
  return fracTime * speedSlider.value();
}
function revealCurve(point) {
  var x = point.x;
  var y = point.y;
  return x + y * Math.sin(revealSlider.value() * x);
}
function isVisible(point, time=0) {
  return timeSubmerged(point,revealCurve) < time;
}

function initializeColorSliders() {
  let colorSliders = []
  for (let i = 0; i < 5; i++) {
    let h = 120 + (30 * i)
    let randomInt = getRandomInt(0,100)
    colorSliders[i] = createSlider(0,100,randomInt)
    colorMode(HSB,20)
    let val = colorSliders[i].value()
    let hs = Math.floor(val/5)
    let b = (val % 5) * 4 + 2
    config[i+1] = color(hs,hs,b)

    colorSliders[i].parent(document.getElementById('color'+String(i+1)))
    colorSliders[i].input((change) => {
      colorMode(HSB,20)
      val = colorSliders[i].value()
      hs = Math.floor(val/5)
      b = (val % 5) * 4 + 2
      config[i+1] = color(hs,hs,b)
    })
  }
  return colorSliders
}

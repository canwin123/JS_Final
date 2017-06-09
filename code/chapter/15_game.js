var simpleLevelPlan = [
  "                      ",
  "                      ",
  "  x              = x  ",
  "  x         o o    x  ",
  "  x @      xxxxx   x  ",
  "  xxxxx            x  ",
  "      x!!!!!!!!!!!!x  ",
  "      xxxxxxxxxxxxxx  ",
  "                      "
];
var leftCount = 0;
var rightCount = 0;
var isJump = false;
var touchfloor = false;
var touchswitch = false;
var isMoving = false;

function Level(plan) {
  this.width = plan[0].length;
  this.height = plan.length;
  this.grid = [];
  this.actors = [];

  for (var y = 0; y < this.height; y++) {
    var line = plan[y], gridLine = [];
    for (var x = 0; x < this.width; x++) {
      var ch = line[x], fieldType = null;
      var Actor = actorChars[ch];
      if (Actor)
        this.actors.push(new Actor(new Vector(x, y), ch));
      else if (ch == "x")
        fieldType = "wall";
      else if (ch == "!")
        fieldType = "lava";
      gridLine.push(fieldType);
    }
    this.grid.push(gridLine);
  }

  this.player = this.actors.filter(function (actor) {
    return actor.type == "player";
  })[0];
  this.status = this.finishDelay = null;
}

Level.prototype.isFinished = function () {
  return this.status != null && this.finishDelay < 0;
};

function Vector(x, y) {
  this.x = x; this.y = y;
}
Vector.prototype.plus = function (other) {
  return new Vector(this.x + other.x, this.y + other.y);
};
Vector.prototype.times = function (factor) {
  return new Vector(this.x * factor, this.y * factor);
};

var actorChars = {
  "@": Player,
  "o": Coin,
  "=": Lava, "|": Lava, "v": Lava, "$": Lava,
  "~": FloatFloor,
  "#": FloatFloor,
  "^": Switch
};

function Player(pos) {
  this.pos = pos.plus(new Vector(0, -0.5));
  this.size = new Vector(0.8, 1.5);
  this.speed = new Vector(0, 0);
}
Player.prototype.type = "player";

function Lava(pos, ch) {
  this.pos = pos;
  this.size = new Vector(1, 1);
  if (ch == "=") {
    this.speed = new Vector(2, 0);
  } else if (ch == "|") {
    this.speed = new Vector(0, 2);
  } else if (ch == "v") {
    this.speed = new Vector(0, 3);
    this.repeatPos = pos;
  } else if (ch == "$") {
    this.speed = new Vector(2, 0);
    this.direction = "right";
    this.count = 0;
  }
}
Lava.prototype.type = "lava";

function Coin(pos) {
  this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1));
  this.size = new Vector(0.6, 0.6);
  this.wobble = Math.random() * Math.PI * 2;
}
Coin.prototype.type = "coin";

function FloatFloor(pos, ch) {
  this.pos = pos;
  if (ch == "~") {
    this.size = new Vector(2, 1);
    this.speed = new Vector(2, 0);
  }
  else {
    this.size = new Vector(3, 1);
    this.speed = new Vector(0, 0);
  }
}
FloatFloor.prototype.type = "floatfloor";

function Switch(pos) {
  this.pos = pos;
  this.size = new Vector(1, 1);
  this.direction = "up";
}
Switch.prototype.type = "switch";

var simpleLevel = new Level(simpleLevelPlan);

function elt(name, className) {
  var elt = document.createElement(name);
  if (className) elt.className = className;
  return elt;
}

function DOMDisplay(parent, level) {
  this.wrap = parent.appendChild(elt("div", "game"));
  this.level = level;

  this.wrap.appendChild(this.drawBackground());
  this.actorLayer = null;
  this.drawFrame();
}

var scale = 20;

DOMDisplay.prototype.drawBackground = function () {
  var table = elt("table", "background");
  table.style.width = this.level.width * scale + "px";
  this.level.grid.forEach(function (row) {
    var rowElt = table.appendChild(elt("tr"));
    rowElt.style.height = scale + "px";
    row.forEach(function (type) {
      rowElt.appendChild(elt("td", type));
    });
  });
  return table;
};

DOMDisplay.prototype.drawActors = function () {
  var wrap = elt("div");
  this.level.actors.forEach(function (actor) {
    var rect = wrap.appendChild(elt("div",
      "actor " + actor.type));
    if (actor.type == "player") {
      if (isJump) {
        if (leftCount > 0)
          rect.style.backgroundImage = "url(image/jumpl.png)";
        else
          rect.style.backgroundImage = "url(image/jumpr.png)";
      }
      else {
        if (leftCount == 0 && rightCount == 0)
          rect.style.backgroundImage = "url(image/r1.png)";
        else if (rightCount > 0) {
          var number = parseInt((rightCount % 16) / 2) + 2;
          rect.style.backgroundImage = "url(image/r" + number + ".png)";
        }
        else if (leftCount > 0) {
          var number = parseInt((leftCount % 16) / 2) + 2;
          rect.style.backgroundImage = "url(image/l" + number + ".png)";
        }
      }
    } else if (actor.type == "switch") {
      if (actor.direction == "up")
        rect.style.backgroundImage = "url(image/up.png)";
      else
        rect.style.backgroundImage = "url(image/down.png)";
    }
    rect.style.width = actor.size.x * scale + "px";
    rect.style.height = actor.size.y * scale + "px";
    rect.style.left = actor.pos.x * scale + "px";
    rect.style.top = actor.pos.y * scale + "px";
  });
  return wrap;
};

DOMDisplay.prototype.drawFrame = function () {
  if (this.actorLayer)
    this.wrap.removeChild(this.actorLayer);
  this.actorLayer = this.wrap.appendChild(this.drawActors());
  this.wrap.className = "game " + (this.level.status || "");
  this.scrollPlayerIntoView();
};

DOMDisplay.prototype.scrollPlayerIntoView = function () {
  var width = this.wrap.clientWidth;
  var height = this.wrap.clientHeight;
  var margin = width / 3;

  // The viewport
  var left = this.wrap.scrollLeft, right = left + width;
  var top = this.wrap.scrollTop, bottom = top + height;

  var player = this.level.player;
  var center = player.pos.plus(player.size.times(0.5))
    .times(scale);

  if (center.x < left + margin)
    this.wrap.scrollLeft = center.x - margin;
  else if (center.x > right - margin)
    this.wrap.scrollLeft = center.x + margin - width;
  if (center.y < top + margin)
    this.wrap.scrollTop = center.y - margin;
  else if (center.y > bottom - margin)
    this.wrap.scrollTop = center.y + margin - height;
};

DOMDisplay.prototype.clear = function () {
  this.wrap.parentNode.removeChild(this.wrap);
};

Level.prototype.obstacleAt = function (pos, size) {
  var xStart = Math.floor(pos.x);
  var xEnd = Math.ceil(pos.x + size.x);
  var yStart = Math.floor(pos.y);
  var yEnd = Math.ceil(pos.y + size.y);

  if (xStart < 0 || xEnd > this.width || yStart < 0)
    return "wall";
  if (yEnd > this.height)
    return "lava";
  for (var y = yStart; y < yEnd; y++) {
    for (var x = xStart; x < xEnd; x++) {
      var fieldType = this.grid[y][x];
      if (fieldType) return fieldType;
    }
  }
};

Level.prototype.actorAt = function (actor) {
  for (var i = 0; i < this.actors.length; i++) {
    var other = this.actors[i];
    if (other != actor &&
      actor.pos.x + actor.size.x > other.pos.x &&
      actor.pos.x < other.pos.x + other.size.x &&
      actor.pos.y + actor.size.y > other.pos.y &&
      actor.pos.y < other.pos.y + other.size.y) {
      if (other.type != "floatfloor")
        return other;
    }
  }
};

Level.prototype.floatfloorAt = function (pos, size) {
  var xStart = Math.floor(pos.x);
  var xEnd = Math.ceil(pos.x + size.x);
  var yEnd = pos.y + size.y;
  var floatFloor;
  for (var i = 0; i < this.actors.length; i++) {
    if (this.actors[i].type == "floatfloor") {
      floatFloor = this.actors[i];
      break;
    }
  }
  if (floatFloor != null) {
    if (xStart < floatFloor.pos.x + floatFloor.size.x && xEnd > floatFloor.pos.x && yEnd >= floatFloor.pos.y)
      return true;
    else
      return false;
  }
}

var maxStep = 0.05;

Level.prototype.animate = function (step, keys) {
  if (this.status != null)
    this.finishDelay -= step;

  while (step > 0) {
    var thisStep = Math.min(step, maxStep);
    this.actors.forEach(function (actor) {
      if (actor.type != "switch")
        actor.act(thisStep, this, keys);
    }, this);
    step -= thisStep;
  }
};

Lava.prototype.act = function (step, level) {
  var newPos = this.pos.plus(this.speed.times(step));
  if (!this.direction) {
    if (!level.obstacleAt(newPos, this.size))
      this.pos = newPos;
    else if (this.repeatPos)
      this.pos = this.repeatPos;
    else
      this.speed = this.speed.times(-1);
  } else {
    if (!level.obstacleAt(newPos, this.size)) {
      this.pos = newPos;
      if (this.count <= Math.random() * 1000 + 100) {
        this.count++;
      } else {
        if (this.direction == "left") {
          this.direction = "right"
          this.count = 0;
        } else {
          this.direction = "left"
          this.count = 0;
        }
      }
    } else {
      if (this.direction == "left") {
        this.direction = "right"
        this.count = 0;
      } else {
        this.direction = "left"
        this.count = 0;
      }
    }
    if (this.direction == "left")
      this.speed = new Vector(-3, 0);
    else
      this.speed = new Vector(3, 0);
  }
};

FloatFloor.prototype.act = function (step, level) {
  var newPos = this.pos.plus(this.speed.times(step));
  if (!level.obstacleAt(newPos, this.size)) {
    if (newPos.y <= 17 && this.size.x == 3) {
      this.speed.y = 0;
      isMoving = false;
    }
    else
      this.pos = newPos;
  }
  else {
    this.speed = this.speed.times(-1);
    if (this.size.x == 3) {
      this.speed.y = 0;
      isMoving = false;
    }
  }
};

var wobbleSpeed = 8, wobbleDist = 0.07;

Coin.prototype.act = function (step) {
  this.wobble += step * wobbleSpeed;
  var wobblePos = Math.sin(this.wobble) * wobbleDist;
  this.pos = this.basePos.plus(new Vector(0, wobblePos));
};

var playerXSpeed = 7;

Player.prototype.moveX = function (step, level, keys) {
  this.speed.x = 0;
  if (keys.left) {
    leftCount++;
    rightCount = 0;
    this.speed.x -= playerXSpeed;
  }
  else if (keys.right) {
    rightCount++;
    leftCount = 0;
    this.speed.x += playerXSpeed;
  }
  else {
    leftCount = 0;
    rightCount = 0;
  }
  var floor;
  for (var i = 0; i < level.actors.length; i++) {
    if (level.actors[i].type == "floatfloor") {
      floor = level.actors[i];
      break;
    }
  }
  if (touchfloor) {
    this.speed.x += floor.speed.x;
  }
  var motion = new Vector(this.speed.x * step, 0);
  var newPos = this.pos.plus(motion);
  var obstacle = level.obstacleAt(newPos, this.size);
  if (obstacle)
    level.playerTouched(obstacle);
  else
    this.pos = newPos;
};

var gravity = 30;
var jumpSpeed = 17;

Player.prototype.moveY = function (step, level, keys) {
  this.speed.y += step * gravity;
  var f = level.actors.filter(function (actor) {
    return actor.type == "floatfloor";
  })[0];
  if (f.size.x == 3 && touchfloor && isMoving) {
    if (keys.up && this.speed.y > 0) {
      this.speed.y = -jumpSpeed;
      isJump = true;
      touchfloor = false;
    } else {
      this.speed.y = f.speed.y;
      isJump = false;
      touchfloor = true;
    }
  }
  var motion = new Vector(0, this.speed.y * step);
  var newPos = this.pos.plus(motion);
  var obstacle = level.obstacleAt(newPos, this.size);
  if (obstacle) {
    level.playerTouched(obstacle);
    if (keys.up && this.speed.y > 0) {
      this.speed.y = -jumpSpeed;
      isJump = true;
    }
    else {
      this.speed.y = 0;
      isJump = false;
    }
  }
  else if (level.floatfloorAt(newPos, this.size)) {
    if (keys.up && this.speed.y > 0) {
      this.speed.y = -jumpSpeed;
      isJump = true;
      touchfloor = false;
    }
    if (this.speed.y > 0) {
      this.speed.y = 0;
      isJump = false;
      touchfloor = true;
    }
  }
  else {
    this.pos = newPos;
  }
};

Player.prototype.act = function (step, level, keys) {
  this.moveX(step, level, keys);
  this.moveY(step, level, keys);

  var otherActor = level.actorAt(this);
  if (otherActor)
    level.playerTouched(otherActor.type, otherActor);
  else
    touchswitch = false;

  // Losing animation
  if (level.status == "lost") {
    this.pos.y += step;
    this.size.y -= step;
  }
};

Level.prototype.playerTouched = function (type, actor) {
  if (type == "lava" && this.status == null) {
    this.status = "lost";
    this.finishDelay = 1;
    leftCount = 0;
    rightCount = 0;
    isJump = false;
    touchfloor = false;
    isMoving = false;
  } else if (type == "coin") {
    this.actors = this.actors.filter(function (other) {
      return other != actor;
    });
    if (!this.actors.some(function (actor) {
      return actor.type == "coin";
    })) {
      this.status = "won";
      this.finishDelay = 1;
      leftCount = 0;
      rightCount = 0;
      isJump = false;
      touchfloor = false;
      isMoving = false;
    }
  } else if (type == "switch") {
    touchswitch = true;
  }
};

var arrowCodes = { 37: "left", 38: "up", 39: "right" };

function trackKeys(codes) {
  var pressed = Object.create(null);
  function handler(event) {
    if (codes.hasOwnProperty(event.keyCode)) {
      var down = event.type == "keydown";
      pressed[codes[event.keyCode]] = down;
      event.preventDefault();
    }
  }
  addEventListener("keydown", handler);
  addEventListener("keyup", handler);
  return pressed;
}

function runAnimation(frameFunc) {
  var lastTime = null;
  function frame(time) {
    var stop = false;
    if (lastTime != null) {
      var timeStep = Math.min(time - lastTime, 100) / 1000;
      stop = frameFunc(timeStep) === false;
    }
    lastTime = time;
    if (!stop)
      requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

var arrows = trackKeys(arrowCodes);

function runLevel(level, Display, andThen) {
  var display = new Display(document.body, level);
  function switchhandler() {
    var s;
    s = level.actors.filter(function (actor) {
      return actor.type == "switch";
    })[0];
    var f;
    f = level.actors.filter(function (actor) {
      return actor.type == "floatfloor";
    })[0];
    if (event.keyCode == 27 && event.type == "keydown" && touchswitch) {
      if (s.direction == "up") {
        s.direction = "down";
        f.speed.y = 2;
      }
      else {
        s.direction = "up";
        f.speed.y = -2;
      }
      isMoving = true;
      touchfloor = false;
    }
  }
  addEventListener("keydown", switchhandler);
  runAnimation(function (step) {
    level.animate(step, arrows);
    display.drawFrame(step);
    if (level.isFinished()) {
      display.clear();
      if (andThen)
        andThen(level.status);
      return false;
    }
  });
}

function runGame(plans, Display) {
  function startLevel(n, lives) {
    leftCount = 0;
    rightCount = 0;
    isJump = false;
    touchfloor = false;
    isMoving = false;
    arrows.up = false;
    arrows.left = false;
    arrows.right = false;
    runLevel(new Level(plans[n]), Display, function (status) {
      if (status == "lost") {
        if (lives > 0) {
          startLevel(n, lives - 1);
          document.getElementById("lives").removeChild(document.getElementById("lives").childNodes[0]);
        } else {
          console.log("Game over");
          var img1 = new Image();
          img1.src = "image/live.png";
          img1.style.width = 25 + "px";
          img1.style.height = 25 + "px";
          img1.style.margin = 0 + "px " + 2 + "px " + 0 + "px " + 2 + "px";
          document.getElementById("lives").appendChild(img1);
          var img2 = new Image();
          img2.src = "image/live.png";
          img2.style.width = 25 + "px";
          img2.style.height = 25 + "px";
          img2.style.margin = 0 + "px " + 2 + "px " + 0 + "px " + 2 + "px";
          document.getElementById("lives").appendChild(img2);
          var img3 = new Image();
          img3.src = "image/live.png";
          img3.style.width = 25 + "px";
          img3.style.height = 25 + "px";
          img3.style.margin = 0 + "px " + 2 + "px " + 0 + "px " + 2 + "px";
          document.getElementById("lives").appendChild(img3);
          startLevel(0, 3);
          second = 0;
        }
      } else if (n < plans.length - 1) {
        var name = prompt("请输入您的名字", "");
        if(name){
        var db = getCurrentDb();
          //插入数据
        db.transaction(function (trans) {
          trans.executeSql("insert into Game(name,second,lives) values(?,?,?) ", [name, second, lives], function (ts, data) {
          }, function (ts, message) {
                        alert(message);
                    });

                });
                showAllTheData();
        }
        document.getElementById("clear").style.visibility="visible";
        startLevel(n + 1, lives);
      } else {
        console.log("You win!");
      }
    });
  }
  startLevel(0, 3);
}

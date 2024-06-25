// Bakeoff #2 - Seleção de Alvos Fora de Alcance
// IPM 2021-22, Período 3
// Entrega: até dia 22 de Abril às 23h59 através do Fenix
// Bake-off: durante os laboratórios da semana de 18 de Abril

// p5.js reference: https://p5js.org/reference/

// Database (CHANGE THESE!)
const GROUP_NUMBER = "35-TP"; // Add your group number here as an integer (e.g., 2, 3)
const BAKE_OFF_DAY = false; // Set to 'true' before sharing during the bake-off day

// Target and grid properties (DO NOT CHANGE!)
let PPI, PPCM;
let TARGET_SIZE;
let TARGET_PADDING, MARGIN, LEFT_PADDING, TOP_PADDING;
let continue_button;
let inputArea = { x: 0, y: 0, h: 0, w: 0 }; // Position and size of the user input area

// Metrics
let testStartTime, testEndTime; // time between the start and end of one attempt (54 trials)
let hits = 0; // number of successful selections
let misses = 0; // number of missed selections (used to calculate accuracy)
let database; // Firebase DB

// Study control parameters
let draw_targets = false; // used to control what to show in draw()
let trials = []; // contains the order of targets that activate in the test
let current_trial = 0; // the current trial number (indexes into trials array above)
let attempt = 0; // users complete each test twice to account for practice (attemps 0 and 1)
let fitts_IDs = []; // add the Fitts ID for each selection here (-1 when there is a miss)

// Target class (position and width)
class Target {
  constructor(x, y, w) {
    this.x = x;
    this.y = y;
    this.w = w;
  }
}

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class GridPoint {
  constructor(row, col) {
    this.row = row;
    this.col = col;
  }
}

let prevClick = new Point(0, 0);
let optimal_misses = 2;
var hit, miss, good_time, bad_time, horrible_time, great_time, heart;
let previousHover = new GridPoint(0, 0);


function preload() {
  hit = loadSound("hit.wav");
  miss = loadSound("miss.wav");
  bad_time = loadSound("more_than_1s.wav");
  horrible_time = loadSound("more_than_2s.wav");
  great_time = loadSound("less_than_500_ms.wav");
  heart = loadImage("heart.png");
  hit.setVolume(0.05);
  miss.setVolume(0.05);
  bad_time.setVolume(0.25);
  horrible_time.setVolume(0.25);
  great_time.setVolume(0.25);
}

// Runs once at the start
function setup() {
  createCanvas(700, 500); // window size in px before we go into fullScreen()
  frameRate(60); // frame rate (DO NOT CHANGE!)

  randomizeTrials(); // randomize the trial order at the start of execution

  textFont("Arial", 18); // font size for the majority of the text
  drawUserIDScreen(); // draws the user start-up screen (student ID and display size)
}

// Runs every frame and redraws the screen
function draw() {
  
  // Framerate debugging
  // console.log("FPS" + frameRate());
  
  if (draw_targets) {
    // The user is interacting with the 6x3 target grid
    background(color(0, 0, 0)); // sets background to black

    // Print trial count at the top left-corner of the canvas
    fill(color(255, 255, 255));
    textAlign(LEFT);
    text("Trial " + (current_trial + 1) + " of " + trials.length, 50, 20);
    
    // Draw all 18 targets
    for (var i = 0; i < 18; i++) {
      drawTarget(i, false);
      drawTarget(i, true);
      let trow = Math.floor(i / 3);
      let tcol = i % 3;
      if (i != trials[current_trial] && i != trials[current_trial + 1])
        drawSnappingSquare(trow, tcol, color(100, 100, 100, 128), false, true);
    }

    // Draw the virtual cursor and keeps it on the squares
    let x = LEFT_PADDING + TARGET_PADDING + (previousHover.col * (TARGET_PADDING * 2));
    let y = TOP_PADDING + TARGET_PADDING + (previousHover.row * (TARGET_PADDING * 2));
    if(insideTargetsArea()) {
    let snapTarget = snapBetweenTargetArea();
      x = LEFT_PADDING + TARGET_PADDING + (snapTarget.col * (TARGET_PADDING * 2));
      y = TOP_PADDING + TARGET_PADDING + (snapTarget.row * (TARGET_PADDING * 2));
      previousHover.row = snapTarget.row;
      previousHover.col = snapTarget.col;
    } 
    isCursorInTarget() ? stroke(color(0, 255, 0)) : noStroke();
    
    
    drawLineMouseToTarget(x, y);
    
    drawCursor(x, y);
    
    drawInputArea();
    
    let row = Math.floor(trials[current_trial] / 3);
    let col = trials[current_trial] % 3;
    let next_row = Math.floor(trials[current_trial + 1] / 3);
    let next_col = trials[current_trial + 1] % 3;
    drawSnappingSquare(row, col, color(0, 255, 0), true, false);
    drawSnappingSquare(next_row, next_col, color(255, 0, 0), false, false);
    
    if (current_trial === 0) {
      drawTextInfo();
    }
   }
}

function drawCursor(x, y) {

  fill(color(0, 255, 0));
  strokeWeight(5);
  beginShape();
  vertex(x - 5,y + 5);
  vertex(x, y + 15);
  vertex(x + 5,y + 5);
  vertex(x + 15, y);
  vertex(x + 5,y - 4);
  vertex(x, y - 15);
  vertex(x - 5, y - 4);
  vertex(x - 15, y);
  endShape(CLOSE);
  //circle(x, y, 0.35 * PPCM);
}

// Print and save results at the end of 54 trials
function printAndSavePerformance() {
  
  noStroke();
  // DO NOT CHANGE THESE!
  let accuracy = parseFloat(hits * 100) / parseFloat(hits + misses);
  let test_time = (testEndTime - testStartTime) / 1000;
  let time_per_target = nf(test_time / parseFloat(hits + misses), 0, 3);
  let penalty = constrain(
    (parseFloat(95) - parseFloat(hits * 100) / parseFloat(hits + misses)) * 0.2,
    0, 100
  );
  let target_w_penalty = nf(
    test_time / parseFloat(hits + misses) + penalty,
    0, 3
  );
  let timestamp = day() + "/" + month() + "/" + year() + "  " + hour() + ":" + minute() + ":" + second();

  background(color(0, 0, 0)); // clears screen
  fill(color(255, 255, 255)); // set text fill color to white
  text(timestamp, 10, 20); // display time on screen (top-left corner)

  textAlign(CENTER);
  text("Attempt " + (attempt + 1) + " out of 2 completed!", width / 2, 60);
  text("Hits: " + hits, width / 2, 100);
  text("Misses: " + misses, width / 2, 120);
  text("Accuracy: " + accuracy + "%", width / 2, 140);
  text("Total time taken: " + test_time + "s", width / 2, 160);
  text("Average time per target: " + time_per_target + "s", width / 2, 180);
  text(
    "Average time for each target (+ penalty): " + target_w_penalty + "s",
    width / 2, 220
  );

  if (target_w_penalty < 0.500) {
    great_time.play();
  } else if (target_w_penalty >= 0.835 && target_w_penalty < 0.835 * 2) {
    bad_time.play();
  } else if (target_w_penalty >= 0.835 * 2) {
    horrible_time.play();
  }
  
  // Print Fitts IDS (one per target, -1 if failed selection, optional)
  //
  text("Fitts Index of Performance:", width / 2, 260);
  for (var c = 0; c < 3; c += 1) {
    for (var l = 0; l < 18; l += 1) {
      if (c == 0 && l == 0) {
        text("Target 1: ---", width / 6, 300);
      }
      else {
        var di_string = fitts_IDs[18 * c + l] == -1 ? "MISSED" :
          (Math.round(fitts_IDs[18 * c + l] * 1000) / 1000).toFixed(3);
        text("Target " + (18 * c + l + 1) + ": " + di_string, width / 6 * (2 * c + 1), 300 + 20 * l);
      }
    }
  }

  // Saves results (DO NOT CHANGE!)
  let attempt_data = {
    project_from: GROUP_NUMBER,
    assessed_by: student_ID,
    test_completed_by: timestamp,
    attempt: attempt,
    hits: hits,
    misses: misses,
    accuracy: accuracy,
    attempt_duration: test_time,
    time_per_target: time_per_target,
    target_w_penalty: target_w_penalty,
    fitts_IDs: fitts_IDs,
  };

  // Send data to DB (DO NOT CHANGE!)
  if (BAKE_OFF_DAY) {
    // Access the Firebase DB
    if (attempt === 0) {
      firebase.initializeApp(firebaseConfig);
      database = firebase.database();
    }

    // Add user performance results
    let db_ref = database.ref("G" + GROUP_NUMBER);
    db_ref.push(attempt_data);
  }
}

// Mouse button was pressed - lets test to see if hit was in the correct target
function mousePressed() {
  // Only look for mouse releases during the actual test
  // (i.e., during target selections)
  if (draw_targets) {
    // Get the location and size of the target the user should be trying to select
    let target = getTargetBounds(trials[current_trial]);

    // Check to see if the virtual cursor is inside the target bounds,
    // increasing either the 'hits' or 'misses' counters
    
    let virtual_x = LEFT_PADDING + TARGET_PADDING + (previousHover.col * (TARGET_PADDING * 2));
    let virtual_y = TOP_PADDING + TARGET_PADDING + (previousHover.row * (TARGET_PADDING * 2));
    let distance = dist(target.x, target.y, prevClick.x, prevClick.y);
    if (isCursorInTarget()) {
      hit.play();
      hits++;
      fitts_IDs[current_trial] = Math.log2(distance / target.w + 1);
    }
    else {
      miss.play();
      misses++;
      fitts_IDs[current_trial] = -1;
    }
    prevClick = new Point(virtual_x, virtual_y);
    current_trial++; // Move on to the next trial/target

  // Check if the user has completed all 54 trials
  if (current_trial === trials.length) {
    testEndTime = millis();
    draw_targets = false; // Stop showing targets and the user performance results
    printAndSavePerformance(); // Print the user's results on-screen and send these to the DB
    attempt++;

    // If there's an attempt to go create a button to start this
    if (attempt < 2) {
      continue_button = createButton("START 2ND ATTEMPT");
      continue_button.mouseReleased(continueTest);
      continue_button.position(
        width / 2 - continue_button.size().width / 2,
        height / 2 - continue_button.size().height / 2
      );
    }
  } else if (current_trial === 1) testStartTime = millis();
  }
}

function isCursorInTarget() {
  let target = getGridPointTarget();
  
  return previousHover.row === target.row && previousHover.col === target.col;
}

// Draw target on-screen
function drawTarget(i) {
  let target = getTargetBounds(i);
  let nextTarget = getTargetBounds(i + 1);

  // Check whether this target is the target the user should be trying to select
  if (trials[current_trial] === i || trials[current_trial + 1] === i) {
    
    if (trials[current_trial] === i) {
      strokeWeight(5);
      if (isCursorInTarget()) {
        stroke(color(255, 0, 0));
        fill(color(255, 255, 255));
      } else {
        fill(color(0, 255, 0));
        stroke(255, 255, 255);
      }
    } else {
      strokeWeight(5);
      fill(color(255, 0, 0));
    }
    stroke(color(255, 255, 255));

  }
  // Does not draw a border if this is not the target the user
  // should be trying to select
  else {
    fill(color(100, 100, 100));
    noStroke();
  }
  circle(target.x, target.y, target.w);
}

function drawSnappingSquare(row, col, target_color, isCurrentTarget, hasBorder) {
  
  let rectx = rectInputArea.x + rectInputArea.w / 3 * col;
  let recty = rectInputArea.y + rectInputArea.h / 6 * row;
  let rectWidth = rectInputArea.w / 3;
  let rectHeight = rectInputArea.h / 6;

  fill(target_color);
    strokeWeight(2);
  if(isCurrentTarget && isCursorInTarget()) {
    stroke(color(0, 255, 0));
    fill(color(255, 255, 255));
  } else {
    if(hasBorder) {
      stroke(color(0, 0, 0)); 
    } else {
      noStroke();
    }
  }

  rect(rectx, recty, rectWidth, rectHeight);
  noFill();
  noStroke();

  if (!hasBorder && trials[current_trial] === trials[current_trial + 1]) {
    fill(isCursorInTarget() ? color(255, 255, 255) :color(0, 255, 0));
    rect(rectx + 10, recty + 10, rectWidth - 20, rectHeight - 20);
  }
}

function getGridPointTarget() {
  let row = Math.floor(trials[current_trial] / 3);
  let col = trials[current_trial] % 3;
  
  return new GridPoint(row, col);
}

function insideTargetsArea() {
  return rectInputArea.x <= mouseX && mouseX <= rectInputArea.x + rectInputArea.w &&
         rectInputArea.y <= mouseY && mouseY <= rectInputArea.y + rectInputArea.h
}

function snapBetweenTargetArea() {
  let conv_x = mouseX - rectInputArea.x;
  let conv_y = mouseY - rectInputArea.y;
  
  for(var r = 0; r < 6; r += 1) {
    if(rectInputArea.h / 6 * r <= conv_y && conv_y < rectInputArea.h / 6 * (r + 1)) {
      for(var c = 0; c < 3; c += 1) {
        if(rectInputArea.w / 3 * c <= conv_x && conv_x < rectInputArea.w / 3 * (c + 1)) 
          return new GridPoint(r, c);
      }
    }
  }
  return new GridPoint(0, 0);
}

function drawLineBetweenTargets(inInput) {
  if (trials[current_trial] == trials[current_trial + 1]) {
    return;
  }
  let target = getTargetBounds(inInput ? trials[current_trial] : trials[current_trial + 1]);
  let nextTarget = getTargetBounds(inInput ? trials[current_trial] : trials[current_trial + 1]);
  stroke(color(255, 255, 255));
  strokeWeight(!inInput ? 15 : 5);
  strokeCap(SQUARE);

  if (!inInput) {
    let angle = Math.atan2(nextTarget.y - target.y, nextTarget.x - target.x);

    let x = target.x + (TARGET_SIZE / 2) * Math.cos(angle);
    let y = target.y + (TARGET_SIZE / 2) * Math.sin(angle);

    let nextX = nextTarget.x - (TARGET_SIZE / 2) * Math.cos(angle);
    let nextY = nextTarget.y - (TARGET_SIZE / 2) * Math.sin(angle);

  }
  line(x, y, nextX, nextY);

}

function drawLineMouseToTarget(virtual_x, virtual_y) {
  let target = getTargetBounds(trials[current_trial]);

  let distance = dist(virtual_x, virtual_y, target.x, target.y);
  let c = map(distance, 0, 1500, 0, 1, true);
  
  let distantColor = color(255, 0, 0);
  let closeColor = color(0, 255, 0);
  
  let angle = Math.atan2(virtual_y - target.y, virtual_x - target.x);
  let x = target.x + (TARGET_SIZE / 2) * Math.cos(angle);
  let y = target.y + (TARGET_SIZE / 2) * Math.sin(angle);

  stroke(lerpColor(closeColor, distantColor, c));
  
  strokeWeight(4);
  strokeCap(ROUND);
  if (!isCursorInTarget())
    line(virtual_x, virtual_y, x, y);

}

// Returns the location and size of a given target
function getTargetBounds(i) {  
  
  let x = parseInt(LEFT_PADDING) + parseInt((i % 3) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);
  let y = parseInt(TOP_PADDING) + parseInt(Math.floor(i / 3) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);

  return new Target(x, y, TARGET_SIZE);
}


function getTargetBoundsInput(i) {
  let x = parseInt(rectInputArea.x + LEFT_PADDING_INPUT) + parseInt((i % 3) * (TARGET_SIZE_INPUT + TARGET_PADDING_INPUT) + MARGIN_INPUT);
  let y = parseInt(rectInputArea.y + TOP_PADDING_INPUT) + parseInt(Math.floor(i / 3) * (TARGET_SIZE_INPUT + TARGET_PADDING_INPUT) + MARGIN_INPUT);
  
  return new Target(x, y, TARGET_SIZE_INPUT);
}

// Evoked after the user starts its second (and last) attempt
function continueTest() {
  // Re-randomize the trial order
  shuffle(trials, true);
  current_trial = 0;
  print("trial order: " + trials);

  // Resets performance variables
  hits = 0;
  misses = 0;
  fitts_IDs = [];

  continue_button.remove();

  // Shows the targets again
  draw_targets = true;
  testStartTime = millis();
}

// Is invoked when the canvas is resized (e.g., when we go fullscreen)
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  let display = new Display({ diagonal: display_size }, window.screen);

  // DO NOT CHANGE THESE!
  PPI = display.ppi; // calculates pixels per inch
  PPCM = PPI / 2.54; // calculates pixels per cm
  TARGET_SIZE = 1.5 * PPCM; // sets the target size in cm, i.e, 1.5cm
  TARGET_PADDING = 1.5 * PPCM; // sets the padding around the targets in cm
  MARGIN = 1.5 * PPCM; // sets the margin around the targets in cm

  // Sets the margin of the grid of targets to the left of the canvas (DO NOT CHANGE!)
  LEFT_PADDING = width / 3 - TARGET_SIZE - 1.5 * TARGET_PADDING - 1.5 * MARGIN;

  // Sets the margin of the grid of targets to the top of the canvas (DO NOT CHANGE!)
  TOP_PADDING = height / 2 - TARGET_SIZE - 3.5 * TARGET_PADDING - 1.5 * MARGIN;

  // Defines the user input area (DO NOT CHANGE!)
  inputArea = {
    x: width / 2 + 2 * TARGET_SIZE, y: height / 2,
    w: width / 3, h: height / 3,
  };

  // User edit
  // Values for the targets inside the input
  TARGET_SIZE_INPUT = 0.5 * PPCM;
  TARGET_PADDING_INPUT = 0.5 * PPCM;
  MARGIN_INPUT = 0.5 * PPCM;
  LEFT_PADDING_INPUT = inputArea.w / 3 - TARGET_SIZE_INPUT - 1.5 * TARGET_PADDING_INPUT - 1.5 * MARGIN_INPUT;
  TOP_PADDING_INPUT = inputArea.y / 3 - TARGET_SIZE_INPUT - 3.5 * TARGET_PADDING_INPUT - 1.5 * MARGIN_INPUT;

  rectInputArea = {
    x: inputArea.x + LEFT_PADDING_INPUT,
    y: inputArea.y,
    w: TARGET_SIZE_INPUT * 3 + TARGET_PADDING_INPUT * 3,
    h: inputArea.h,
  };

  // End user edit

  // Starts drawing targets immediately after we go fullscreen
  draw_targets = true;
}

// Responsible for drawing the input area
function drawInputArea() {
  noFill();
  stroke(color(220, 220, 220));
  strokeWeight(2);

  rect(inputArea.x, inputArea.y, inputArea.w, inputArea.h);
}

function drawTextInfo() {
      let textVertAlign = inputArea.x  + inputArea.w / 2;
      let title = "Antes de começares, aqui vão algumas informações:";
      fill(color(255, 255, 255));
      textAlign(CENTER);
      textSize(32);
      text(title, textVertAlign, height / 3);
      textSize(24);
      text("Na zona de input estão marcadas as áreas de snapping dos alvos.", textVertAlign, height / 3 + 40);
      text("O alvo atual é verde e o próximo alvo a selecionar é vermelho.", textVertAlign, height / 3 + 70);
      text("Caso o alvo atual esteja na mesma posição que o anterior, o retângulo atual", textVertAlign, height / 3 + 100);
      text("aparecerá dentro do retângulo seguinte, ou seja, verde dentro de vermelho.", textVertAlign, height / 3 + 130);
      textSize(16);
      text("Nota: precisão > rapidez, mais de 2 alvos falhados e és penalizado.", textVertAlign, height / 3 + 170);
      textAlign(RIGHT);
}

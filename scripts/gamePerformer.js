define(['zepto', 'pixi', 'vr', 'handleEventPerformer', 'timer', 'helpers'], function ($, PIXI, vr, HANDLE_EVENT, TIMER, HELPERS) {
  var G = {
    state: {
      started: false
      , database: {
        avatars: null
      ,	myAvatar: null
      ,	attacks: null
      }
    , renderer: null
    , stage: null
    , screensize : {
        w: document.width
      , h: document.height
    }
    , textures: {
        avatar: null
      , attack: null
      }
    , avatarCount: 0
    , avatars: {
      //, audience_member: {
            //go: null
          //, index: 0
        //}
      }
    , counters: {
      shotsFired: 0
    }
    , vr: {
        vrState: null
    }
    , attackCount: 0
    , attacks: {
      }
    , sprites: {}
    , performer: {
        center: null
      , legs: []
      , hitRadius: 50
      , tentacleHitRadius: 35
      , health: 9001
      , healthBar: null
      , maxHealth: 9001
      , healthBarDimensions: {w: 500, h: 50, inset: 5}
      }
    }
  , init: function () {
      var _g = this
        , stage = _g.state.stage;

      _g.state.screensize.h = HELPERS.getDimensions().height;
      _g.state.screensize.w = HELPERS.getDimensions().width;

      _g.setupGraphics.bind(_g)();
      _g.setupObjects.bind(_g)();
      _g.setupDBConnection.bind(_g)();
      HANDLE_EVENT.setupDBCallbacks.bind(_g)();
      _g.setupHandlers.bind(_g)();
      _g.state.vr.vrState = new vr.State();

      vr.load(function(error) {
        if (error) {
          window.alert('VR error:\n' + error.toString());
        }
      });

      requestAnimationFrame(_g.render.bind(_g));
      vr.requestAnimationFrame(_g.tick.bind(_g));
    }
  , setupDBConnection: function () {
      var _g = this
        , database = _g.state.database;
      database.avatars = new Firebase('https://olinhacksmit.firebaseIO.com/avatars');
      database.attacks = new Firebase('https://olinhacksmit.firebaseIO.com/attacks');
    }
  , setupGraphics: function () {
      var _g = this
        , height = _g.state.screensize.h
        , width = _g.state.screensize.w
        , renderer = new PIXI.autoDetectRenderer(width, height)
        , stage = new PIXI.Stage(0xFFCCCC, true);

      renderer.view.style.display = "block";
      document.body.appendChild(renderer.view);

      _g.state.renderer = renderer;
      _g.state.stage = stage;
    }
  , setupObjects: function () {
      var _g = this
        , textures = _g.state.textures
        , avatar = _g.state.avatar
        , performer = _g.state.performer
        , stage = _g.state.stage
        , sprites =  _g.state.sprites
        , size = _g.state.screensize;

      textures.avatar = PIXI.Texture.fromImage("images/avatar2.png");
      textures.attack = PIXI.Texture.fromImage("images/attack.png");
      textures.center = PIXI.Texture.fromImage("images/center.png");
      textures.upperLeg = PIXI.Texture.fromImage("images/appendage1.png");
      textures.lowerLeg = PIXI.Texture.fromImage("images/appendage2.png");
      textures.start = PIXI.Texture.fromImage("images/startButton.png");

      sprites.start = new PIXI.Sprite(textures.start);
      sprites.start.setInteractive(true);
      sprites.start.position.x = size.w/2.0;
      sprites.start.position.y = size.h/2.0;
      sprites.start.initialScale = {x: .75, y: .75};
      sprites.start.hoverIncrease = .02;
      sprites.start.scale.x = .5;
      sprites.start.scale.y = .5;
      sprites.start.pivot.x = 250;
      sprites.start.pivot.y = 250;
      sprites.start.visible = true;


      performer.healthBar = new PIXI.Graphics();

      performer.updateHealthBar = function () {
        var _g = this
            , performer = _g.state.performer
            , size = _g.state.screensize;

        if (performer.health >= 0 && _g.state.started) {
          performer.healthBar.clear();
          performer.healthBar.lineStyle(3, 0xFF7A7A)
          performer.healthBar.drawRect(size.w/2 - performer.healthBarDimensions.w/2, size.h*.9
                                      ,performer.healthBarDimensions.w, performer.healthBarDimensions.h);
          performer.healthBar.beginFill(0xFF7A7A)
          performer.healthBar.lineStyle(0, 0xFFFFFF)
          performer.healthBar.drawRect(size.w/2 - performer.healthBarDimensions.w/2 + performer.healthBarDimensions.inset
                                      ,size.h * .9 + performer.healthBarDimensions.inset
                                      ,(performer.healthBarDimensions.w - 2*performer.healthBarDimensions.inset)*performer.health/performer.maxHealth
                                      ,performer.healthBarDimensions.h - 2*performer.healthBarDimensions.inset);
        } else if (performer.health <= 0) {
          TIMER.endGame.bind(_g)(true);
          performer.healthBar.clear();
          performer.healthBar.lineStyle(3, 0xFF7A7A)
          performer.healthBar.drawRect(size.w/2 - performer.healthBarDimensions.w/2, size.h*.9
                                      ,performer.healthBarDimensions.w, performer.healthBarDimensions.h);
          performer.healthBar.beginFill(0xFF7A7A)
          performer.healthBar.lineStyle(0, 0xFFFFFF)
          performer.healthBar.drawRect(size.w/2 - performer.healthBarDimensions.w/2 + performer.healthBarDimensions.inset
                                      ,size.h * .9 + performer.healthBarDimensions.inset
                                      ,0,0);
        }

      }


      stage.addChild(performer.healthBar);

      sprites.start.click = function(e) {
        sprites.start.visible = false;
        TIMER.start.bind(_g)();
      };

      stage.addChild(sprites.start);

      var center = new PIXI.Sprite(textures.center);

      center.position.x = size.w / 2;
      center.position.y = size.h / 2;

      center.pivot.x = 10;
      center.pivot.y = 10;
      center.visible = false;
      center.scale.x = 1;
      center.scale.y = 1;

      stage.addChild(center);
      performer.center = center;

      function createLeg(rotation) {
        var upperLeg = new PIXI.Sprite(textures.upperLeg)
        , lowerLeg = new PIXI.Sprite(textures.lowerLeg)
        , length = 75;

        upperLeg.position.x = size.w / 2;
        upperLeg.position.y = size.h / 2;
        upperLeg.visible = false;


        upperLeg.pivot.x = 39 / 2;
        upperLeg.pivot.y = 0;

        upperLeg.scale.x = .6;
        upperLeg.scale.y = .6;

        upperLeg.rotation = rotation;

        lowerLeg.position.x = size.w / 2 + Math.cos(rotation + Math.PI/2) * length * upperLeg.scale.x;
        lowerLeg.position.y = size.h / 2 + Math.sin(rotation + Math.PI/2) * length * upperLeg.scale.y;
        lowerLeg.visible = false;


        lowerLeg.pivot.x = 0;
        lowerLeg.pivot.y = 0;

        lowerLeg.scale.x = .6;
        lowerLeg.scale.y = .6;

        lowerLeg.rotation = rotation;

        stage.addChild(upperLeg);
        stage.addChild(lowerLeg);
        performer.legs.push({upperLeg: upperLeg, lowerLeg: lowerLeg});
      }

      createLeg(Math.PI/2);
      createLeg(-Math.PI/2);
  }
  , setupHandlers: function () {
      var _g = this
        , stage = _g.state.stage;
    }
  , render: function () {
      var _g = this;
      _g.simulate.bind(_g)();
      _g.state.renderer.render(_g.state.stage);
    }
  , simulate: function () {
      var _g = this;
      requestAnimationFrame(_g.render.bind(_g));
      requestAnimationFrame(_g.allAttacksAnimationHandler.bind(_g));
      requestAnimationFrame(_g.state.performer.updateHealthBar.bind(_g));
      vr.requestAnimationFrame(_g.tick.bind(_g));
    }
  , defaultAvatar: function (texture) {
      var _g = this
        , stage = _g.state.stage
        , avatar = {};

      avatar.go = new PIXI.Sprite(texture);

      avatar.go.position.x = 400;
      avatar.go.position.y = 300;

      avatar.go.pivot.y = texture.height / 2;
      avatar.go.pivot.x = texture.width / 2;

      stage.addChild(avatar.go);

      return avatar;
  }
  , addAvatar: function (id, avatarData) {
      var _g = this
        , avatars = _g.state.avatars
        , textures = _g.state.textures
        , width = textures.avatar.width
        , height = textures.avatar.height
        , avatar;

      avatar = _g.defaultAvatar(textures.avatar);

      console.log(avatarData);
      avatar.index = _g.state.avatarCount;
      var angle = avatarData.angle;
      console.log(angle);
      avatar.go.rotation = angle - Math.PI;
      avatar.go.position.x = _g.state.screensize.w/2 + 200 * Math.sin(angle);
      avatar.go.position.y = _g.state.screensize.h/2 - 200 * Math.cos(angle);
      console.log(avatar.go.position);
      _g.state.avatarCount += 1;
      avatars[id] = avatar;

  }
  , defaultAttack: function (textures, attacker) {
      console.log("Attacker", attacker);
      var _g = this
        , stage = _g.state.stage
        , attack = {}
        , width = textures.avatar.width
        , rotation = 0;

      if (attacker) {
        rotation = attacker.go.rotation;
        attack.go = new PIXI.Sprite(textures.attack);

        attack.go.position.x = attacker.go.position.x + width * Math.sin(rotation);
        attack.go.position.y = attacker.go.position.y - width * Math.cos(rotation);
        attack.go.rotation = rotation;

        attack.go.scale.x = 1;
        attack.go.scale.y = 1;

        attack.beenDeflected = false;

        attack.lastUpdated = (new Date()).getTime();
        attack.velocity = {x: 0, y: 0};
        var velScale = 1;
        attack.velocity.x = Math.sin(rotation)*velScale;
        attack.velocity.y = -Math.cos(rotation)*velScale;

        stage.addChild(attack.go);
      } else {
        attack.go = new PIXI.Sprite(textures.attack);

        attack.go.position.x = -1000;
        attack.go.position.y = -1000;
        attack.go.rotation = rotation;

        attack.go.scale.x = 1;
        attack.go.scale.y = 1;

        attack.beenDeflected = false;

        attack.lastUpdated = (new Date()).getTime();
        attack.velocity = {x: -1000, y: -1000};

        stage.addChild(attack.go);
      }

      return attack;
  }
  , addAttack: function (attackID, attack) {
      var _g = this
        , textures = _g.state.textures
        , attacker = _g.state.avatars[attack.attacker]
        , attacks = _g.state.attacks;

      attack = _g.defaultAttack(textures, attacker);

      attack.index = _g.state.attackCount;
      _g.state.attackCount += 1;
      attacks[attackID] = attack;
    }
  , allAttacksAnimationHandler: function () {
      var _g = this
        , attacks = _g.state.attacks
        , keysToBeKilled = [];


      for (var attackKey in attacks) {
        if (attacks.hasOwnProperty(attackKey)) {
          var maybeAttack = _g.attackAnimationHandler.bind(_g)(attackKey, attacks);
          if (maybeAttack) {
            keysToBeKilled.push(maybeAttack);
          }
        }
      }

      while (keysToBeKilled.length > 0) {
        var key = keysToBeKilled.pop()
          , nullObj = {};

        nullObj[key] = null;
        _g.state.database.attacks.update(nullObj);
      }
    }
  , attackAnimationHandler: function (attackKey, attacks) {
      var _g = this
        , attack = attacks[attackKey]
        , velocity = attack.velocity
        , min_x = 0
        , max_x = _g.state.screensize.w
        , min_y = 0
        , max_y = _g.state.screensize.w
        , timeDelta = (new Date()).getTime() - attack.lastUpdated
        , centerPosition = _g.state.performer.center.position
        , centerRadius = _g.state.performer.hitRadius
        , tentacleHitRadius = _g.state.performer.tentacleHitRadius
        , damage = 600 / (_g.state.avatarCount + 1)
        , newX
        , newY;
        //, distance = velocity * timeDelta;

      attack.go.rotation = Math.atan2(velocity.y, velocity.x) - Math.PI/2;

      //attack.go.rotation = 0;
      //attack.velocity = {x: 0, y: 0};
      newX = attack.go.position.x + velocity.x * timeDelta;
      newY = attack.go.position.y + velocity.y * timeDelta;

      var dist = Math.sqrt(Math.pow(newX - centerPosition.x, 2) + Math.pow(newY - centerPosition.y, 2));
      if (dist < centerRadius && _g.state.started && !attack.beenDeflected) {
        //decrement health of performer
        _g.state.performer.health -= damage;
        console.log("Health:", _g.state.performer.health);
        return attackKey;
      }

      if (_g.state.started) {
        for (var i = 0; i<_g.state.performer.legs.length; i++) {
          var legPosition = {x: 0, y: 0}
            , angle = _g.state.performer.legs[i].lowerLeg.rotation
            , position = _g.state.performer.legs[i].lowerLeg.position;

          legPosition.x = position.x + 121 * .6 * Math.cos(angle + Math.PI / 2);
          legPosition.y = position.y + 121 * .6 * Math.sin(angle + Math.PI / 2);

          var dist = Math.sqrt(Math.pow(newX - legPosition.x, 2) + Math.pow(newY - legPosition.y, 2));
          if (dist < tentacleHitRadius && !attack.beenDeflected) {
            attack.beenDeflected = true;
            //decrement health of performer
            attack.velocity.x *= -1;
            attack.velocity.y *= -1;
            // return attackKey;
          }
        }
      }

      attack.go.position.x = newX;
      attack.go.position.y = newY;

      //attack.go.position.x += distance * Math.sin(rotation);
      //attack.go.position.y -= distance * Math.cos(rotation);
      var x = attack.go.position.x
        , y = attack.go.position.y;

      attack.lastUpdated = (new Date()).getTime();
      if (x < min_x || x > max_x || y < min_y || y > max_y) {
        return attackKey;
      }

    }

    , tick: function () {
        var _g = this
          , state = _g.state.vr.vrState
          , legs = _g.state.performer.legs
          , screensize = _g.state.screensize
          , length = 110;

        if (!vr.pollState(_g.state.vr.vrState)) {
        }

        if (_g.state.vr.vrState.sixense.present) {
          for (var n = 0; n < state.sixense.controllers.length; n++) {
            var controller = state.sixense.controllers[n];
            var cx = controller.position[0];
            var cy = controller.position[2];
            var angle = Math.atan2(cy, cx);
            legs[n].upperLeg.rotation = angle + Math.PI / 2;

            legs[n].lowerLeg.position.x = screensize.w / 2 + Math.cos(angle + Math.PI) * length * legs[n].upperLeg.scale.x;
            legs[n].lowerLeg.position.y = screensize.h / 2 + Math.sin(angle + Math.PI) * length * legs[n].upperLeg.scale.y;

            // legs[n].lowerLeg.rotation = angle + Math.sin((new Date()).getTime() / 250);
            legs[n].lowerLeg.rotation = angle + Math.PI / 2 + controller.joystick[0];
          }
        }

        if (_g.state.vr.vrState.sixense.present) {
          for (var n = 0; n < state.sixense.controllers.length; n++) {
            var controller = state.sixense.controllers[n];
            var cx = controller.position[0];

            var cy = controller.position[2];
            var angle = Math.atan2(cy, cx);
            _g.state.performer.legs[n].rotation = angle;
          }
        }
      }
  };


  window.G = G;
  return G;
});

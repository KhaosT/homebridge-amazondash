var dash_button = require('node-dash-button');
var Accessory, Service, Characteristic, UUIDGen;

module.exports = function(homebridge) {
  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerPlatform("homebridge-amazondash", "AmazonDash", DashPlatform, true);
}

function DashPlatform(log, config, api) {
  var self = this;

  self.log = log;
  self.config = config || { "platform": "AmazonDash" };
  self.buttons = self.config.buttons || [];

  self.accessories = {}; // MAC -> Accessory

  if (api) {
    self.api = api;

    self.api.on('didFinishLaunching', self.didFinishLaunching.bind(this));
  }
}

DashPlatform.prototype.configureAccessory = function(accessory) {
  var self = this;

  accessory.reachable = true;

  accessory
    .getService(Service.StatelessProgrammableSwitch)
    .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
    .setProps({
      maxValue: 0
    });

  var accessoryMAC = accessory.context.mac;
  self.accessories[accessoryMAC] = accessory;
}

DashPlatform.prototype.didFinishLaunching = function() {
  var self = this;

  for (var i in self.buttons) {
    var button = self.buttons[i];
    if (!self.accessories[button.mac]) {
      self.addAccessory(button.mac, button.name);
    }
  }

  var registedMACs = Object.keys(self.accessories);
  if (registedMACs.length > 0) {
    self.dash = dash_button(registedMACs, null, null, 'all');
    self.dash.on('detected', function(dash_id) {
      var accessory = self.accessories[dash_id];
      if (accessory) {
        self.dashEventWithAccessory(accessory);
      }
    });
  }
}

DashPlatform.prototype.dashEventWithAccessory = function(accessory) {
  this.log.debug('Dash Event [%s]', accessory.displayName);
  var targetChar = accessory
    .getService(Service.StatelessProgrammableSwitch)
    .getCharacteristic(Characteristic.ProgrammableSwitchEvent);

  targetChar.setValue(0);
}

DashPlatform.prototype.addAccessory = function(mac, name) {
  var self = this;
  var uuid = UUIDGen.generate(mac);

  var newAccessory = new Accessory(name, uuid, 15);
  newAccessory.reachable = true;
  newAccessory.context.mac = mac;
  newAccessory.addService(Service.StatelessProgrammableSwitch, name);

  newAccessory
  .getService(Service.StatelessProgrammableSwitch)
  .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
  .setProps({
    maxValue: 0
  });

  newAccessory
  .getService(Service.AccessoryInformation)
  .setCharacteristic(Characteristic.Manufacturer, "Amazon")
  .setCharacteristic(Characteristic.Model, "JK76PL")
  .setCharacteristic(Characteristic.SerialNumber, mac);

  this.accessories[mac] = newAccessory;
  this.api.registerPlatformAccessories("homebridge-amazondash", "AmazonDash", [newAccessory]);

  var dashButton = dash_button(mac, null, null, 'all');
  dashButton.on('detected', function() {
    self.dashEventWithAccessory(newAccessory);
  });
}

DashPlatform.prototype.removeAccessory = function(accessory) {
  if (accessory) {
    var mac = accessory.context.mac;
    this.api.unregisterPlatformAccessories("homebridge-amazondash", "AmazonDash", [accessory]);
    delete this.accessories[mac];
  }
}

DashPlatform.prototype.configurationRequestHandler = function(context, request, callback) {
  if (request && request.type === "Terminate") {
    return;
  }

  if (!context.step) {
    var instructionResp = {
      "type": "Interface",
      "interface": "instruction",
      "title": "Before You Start...",
      "detail": "Please make sure homebridge is running with elevated privileges and you have setup the dependency follow the tutorial.",
      "showNextButton": true,
      "buttonText": "View Tutorial",
      "actionURL": "https://github.com/hortinstein/node-dash-button"
    }

    context.step = 1;
    callback(instructionResp);
  } else {
    switch (context.step) {
      case 1:
        var respDict = {
          "type": "Interface",
          "interface": "list",
          "title": "What do you want to do?",
          "items": [
            "Add New Dash Button",
            "Disassociate Existed Dash Button"
          ]
        }
        context.step = 2;
        callback(respDict);
        break;
      case 2:
        var selection = request.response.selections[0];
        if (selection === 0) {
          //Setup New
          var respDict = {
            "type": "Interface",
            "interface": "input",
            "title": "New Dash Button",
            "items": [
              {
              "id": "name",
              "title": "Name",
              "placeholder": "Orange Dash"
              }, 
              {
              "id": "mac",
              "title": "MAC Address (lowercase)",
              "placeholder": "11:22:33:44:aa:ff"
              }
            ]
          }
          context.step = 4;
          callback(respDict);
        } else {
          //Remove Exist
          var self = this;
          var buttons = Object.keys(this.accessories).map(function(k){return self.accessories[k]});
          var names = buttons.map(function(k){return k.displayName});

          var respDict = {
            "type": "Interface",
            "interface": "list",
            "title": "Which Dash Button do you want to remove?",
            "items": names
          }
          context.buttons = buttons;
          context.step = 6;
          callback(respDict);
        }
        break;
      case 4:
        var userInputs = request.response.inputs;
        var name = userInputs.name;
        var MACAddress = userInputs.mac;
        this.addAccessory(MACAddress, name);
        var respDict = {
          "type": "Interface",
          "interface": "instruction",
          "title": "Success",
          "detail": "The new dash button is now added.",
          "showNextButton": true
        }
        context.step = 5;
        callback(respDict);
        break;
      case 5:
        var self = this;
        delete context.step;
        var newConfig = this.config;
        var newButtons = Object.keys(this.accessories).map(function(k){
          var accessory = self.accessories[k];
          var button = {
            'name': accessory.displayName,
            'mac': accessory.context.mac
          };
          return button;
        });
        newConfig.buttons = newButtons;

        callback(null, "platform", true, newConfig);
        break;
      case 6:
        var selection = request.response.selections[0];
        var accessory = context.buttons[selection];
        this.removeAccessory(accessory);
        var respDict = {
          "type": "Interface",
          "interface": "instruction",
          "title": "Success",
          "detail": "The dash button is now removed.",
          "showNextButton": true
        }
        context.step = 5;
        callback(respDict);
        break;
    }
  }
}

# homebridge-amazondash

Amazon Dash plugin for [Homebridge](https://github.com/nfarina/homebridge)

## Installation

1. Follow the [instruction](https://github.com/hortinstein/node-dash-button) to setup node-dash-button and figure out the MAC Address of the Dash Button.
2. Install this plugin using: npm install -g homebridge-amazondash
3. Update configuration file or use Homebridge's configuration service on iOS device to setup plugin.
4. Run Homebridge with elevated privileges.

### Config.json Example

	{
      "platform": "AmazonDash",
      "buttons": [
        {
          "name": "Dash Blue",
          "mac": "74:c2:46:0a:f9:3f"
        },
        {
          "name": "Dash Orange",
          "mac": "10:ae:60:4d:6a:0b"
        }
      ]
    }


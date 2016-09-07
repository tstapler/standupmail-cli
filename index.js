#!/usr/bin/env node

'use strict'

var Configstore = require('configstore');
var request = require('superagent');
var CryptoJS = require("crypto-js");
var format = require('util').format;
var _ = require('lodash');

var pkg = require('./package.json');

var config = new Configstore(pkg.name);

var HOST_URL = 'https://www.standupmail.com';
var TEAMS_URL = '/api/external/v1/teams';
var DIGEST_URL = '/api/external/v1/teams/%s/digests?start_date=%s&end_date=%s';
var UPDATE_URL = '/api/external/v1/teams/%s/messages';

var cli = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command(
    'login',
    'Set your API Token in a config file.',
    function(yargs) {
      return yargs
        .option('t', {
          alias: 'token',
          describe: 'Set API Token.',
          demand: 'true'
        })
        .option('i', {
          alias: 'id',
          number: true,
          describe: 'Set User Id',
          demand: true
        });
    },
    function(argv) {
      config.set('token', argv.token);
      config.set('id', argv.id);
      getTeams(argv.id, argv.token);
    }
  )
  .command(
    'teams',
    'List the current teams you are assigned to.',
    function(yargs) {return yargs;},
    function(argv) {
      var teams = config.get('teams');
      if (teams) {
        console.log(JSON.stringify(teams));
      } else {
        console.log("Auth not set, please login.")
      }
    }
  )
  .command(
    'show',
    'Get updates for n days.',
    function(yargs) {
      return yargs
        .option('n', {
          alias: 'number',
          number: true,
          default: 1,
          describe: 'Number of days.'
        })
        .option('a', {
          alias: 'all',
          bool: true,
          default: false,
          describe: 'Show entire team\'s messages.'
        })
    },
    function(argv) {
      var token = config.get('token');
      var id = config.get('id');

      if (token == null || id == null) {
        console.log("Auth not set, please login.");
        return;
      }

      getUpdates(id, token, argv.number, argv.all);
    }
  )
  .command(
    'update',
    'Send update to Standupmail',
    function(yargs) {
      return yargs
        .option('d', {
          alias: 'done',
          type: 'string',
          describe: 'New done update.',
        })
        .option('w', {
          alias: 'working',
          type: 'string',
          describe: 'New working update.',
        })
        .option('b', {
          alias: 'blocked',
          type: 'string',
          describe: 'New blocked update.',
        })
        .option('t', {
          alias: 'teams',
          array: true,
          describe: 'Team ids to send to.'
        })
    },
    function(argv) {
      var token = config.get('token');
      var id = config.get('id');

      if (token == null || id == null) {
        console.log("Auth not set, please login.");
        return;
      }

      var teams = [];
      if (argv.teams) {
        _.forEach(argv.teams, function(inputTeam) {
          _.forEach(config.get('teams'), function(configTeam) {
            if (inputTeam == configTeam.id) {
              teams.push(inputTeam);
            }
          });
        });

        if (_.isEmpty(teams)) {
          console.log('No valid teams entered.')
          return;
        }
      } else {
        _.forEach(config.get('teams'), function(team) {
          teams.push(team.id);
        })
      }

      if (argv.done) {
        sendUpdate(id, token, teams, 'done', argv.done);
      } else if (argv.working) {
        sendUpdate(id, token, teams, 'working', argv.working);
      } else if (argv.blocked) {
        sendUpdate(id, token, teams, 'blocked', argv.blocked);
      } else {
        console.log('Update type not found.')
      }
    }
  )
  .help()

var argv = cli.argv

if(argv._.length == 0){
  cli.showHelp()
}

function getTeams(id, token) {
  var date = new Date();
  var time = date.toUTCString();

  var timeString = format(',,%s,%s', TEAMS_URL, time);
  var signiture = CryptoJS.HmacSHA1(timeString, token);
  var sigString = CryptoJS.enc.Base64.stringify(signiture);
  var authHeader = 'APIAuth ' + id + ':' + sigString;

  request
    .get(HOST_URL + TEAMS_URL)
    .accept('application/json')
    .set('DATE', time)
    .set('Authorization', authHeader)
    .end(function(err, res) {
      if (res.status === 200) {
        var teams = [];
        var json = JSON.parse(res.text);

        _.forEach(json, function(team) {
          teams.push({
            'id': team.id,
            'name': team.name
          });
        });

        config.set('teams', teams);
      }
      else if (res.status === 401) {
        console.log(JSON.parse(res.text).message);
      } else {
        console.log('Unknown Error');
      }
    });
}

function getUpdates(id, token, days, all) {
  var teams = config.get('teams');

  var date = new Date();
  var time = date.toUTCString();

  date.setDate(date.getDate() - days);

  var start = formatDate(date);
  var end = formatDate(new Date());

  _.forEach(teams, function(team) {
    var digestUri = format(DIGEST_URL, team.id, start, end);
    var timeString = format(',,%s,%s', digestUri, time);
    var signiture = CryptoJS.HmacSHA1(timeString, token);
    var sigString = CryptoJS.enc.Base64.stringify(signiture);
    var authHeader = 'APIAuth ' + id + ':' + sigString;

    var days = {};
    request
      .get(HOST_URL + digestUri)
      .accept('application/json')
      .set('DATE', time)
      .set('Authorization', authHeader)
      .end(function(err, res) {
        if (res.status === 200) {
          var json = JSON.parse(res.text);

          _.forEach(json, function(day) {
            var dailyMessages = [];

            _.forEach(day.messages, function(userMessage) {
              var user = {};
              var userName = userMessage.user_name.replace('\t', ' ');
              if (all) {
                user[userName] = userMessage.message;
                dailyMessages.push(user);
              } else if (userMessage.user_id === id) {
                user[userName] = userMessage.message;
                dailyMessages.push(user);
                return;
              }
            });

            days[day.date] = dailyMessages;
          });

          console.log(JSON.stringify(days, null, 2));
        }
        else if (res.status > 400 && res.status < 500) {
          console.log(res.text);
        } else {
          console.log('Unknown Error');
        }
      });
  });
}

function sendUpdate(id, token, teams, type, update) {
  var date = new Date();
  var time = date.toUTCString();

  _.forEach(teams, function(team) {
    var messagesUri = format(UPDATE_URL, team);
    var timeString = format('application/json,,%s,%s', messagesUri, time);
    var signiture = CryptoJS.HmacSHA1(timeString, token);
    var sigString = CryptoJS.enc.Base64.stringify(signiture);
    var authHeader = 'APIAuth ' + id + ':' + sigString;

    var req = request
      .post(HOST_URL + messagesUri)
      .send(JSON.stringify({"messages": [{"type": type, "msg": update}]}))
      .accept('application/json')
      .set('Content-Type', 'application/json')
      .set('DATE', time)
      .set('Authorization', authHeader)
      .end(function(err, res) {
        if (res.status == 201) {
          var json = JSON.parse(res.text);

          var messages = {
            'working': json.working,
            'done': json.done,
            'blocked': json.blocked
          }

          console.log(JSON.stringify(messages, null, 2));
        } else if (res.status > 400 && res.status < 500) {
          console.log(res.text);
        } else {
          console.log('Unknown Error');
        }
      });
  });
}

function formatDate(date) {
  var month = date.getMonth() + 1;
  var day = date.getDate();

  var output = date.getFullYear() + '-' +
    (month < 10 ? '0' : '') + month + '-' +
    (day < 10 ? '0' : '') + day;

  return output;
}

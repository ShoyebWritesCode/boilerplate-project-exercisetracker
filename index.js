const Express = require('express');
const CORS = require('cors');
const UserModel = require('./models/UserSchema');
const ExerciseModel = require('./models/ExerciseSchema');
const LogModel = require('./models/LogSchema');
require('dotenv').config();
require('./config/db.config').connectDB();

const App = Express();

App.use(CORS());
App.use(
  Express.urlencoded({
    extended: false,
  })
);
App.use(Express.json());
App.use(Express.static('public'));

App.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// saving a user in the database
App.post('/api/users', (req, res) => {
  const user_obj = new UserModel({
    username: req.body.username,
  });

  user_obj.save((err, new_user) => {
    if (err) {
      res.status(500).json({
        error: err.message,
      });
    } else {
      res.json(new_user);
    }
  });
});

// get all users
App.get('/api/users', (req, res) => {
  UserModel.find((err, all_users) => {
    if (err) {
      res.status(500).json({
        error: err.message,
      });
    } else {
      res.json(all_users);
    }
  });
});

// save exercises for the specified user
App.post('/api/users/:_id/exercises', (req, res) => {
  const user_id = req.params._id;

  UserModel.findById(user_id, (err, user) => {
    if (err) {
      res.status(404).send('User Not Found!');
    } else {
      let date_input;

      if (req.body.date === '') {
        date_input = new Date(Date.now());
      } else {
        date_input = new Date(req.body.date);
      }

      const exercise_obj = new ExerciseModel({
        user_id: user._id,
        username: user.username,
        description: req.body.description,
        duration: req.body.duration,
        date: date_input,
      });

      exercise_obj.save((err, new_exercise) => {
        if (err) {
          res.status(500).json({
            error: err.message,
          });
        } else {
          LogModel.findById(new_exercise.user_id, (err, log) => {
            if (err) {
              res.status(500).json({
                error: err.message,
              });
            }
            if (log === null) {
              let old_count = 0;

              const log_obj = new LogModel({
                _id: new_exercise.user_id,
                username: new_exercise.username,
                count: ++old_count,
                log: [
                  {
                    description: new_exercise.description,
                    duration: new_exercise.duration,
                    date: new_exercise.date,
                  },
                ],
              });

              log_obj.save((err, new_log) => {
                if (err) {
                  res.status(400).send('Bad Request Cannot Create Log!');
                }
              });
            } else {
              ExerciseModel.find(
                { user_id: new_exercise.user_id },
                (err, docs) => {
                  if (err) {
                    res.status(500).json({
                      error: err.message,
                    });
                  } else {
                    const log_arr = docs.map((exerciseObj) => {
                      return {
                        description: exerciseObj.description,
                        duration: exerciseObj.duration,
                        date: exerciseObj.date,
                      };
                    });

                    const new_count = log_arr.length;

                    LogModel.findByIdAndUpdate(
                      new_exercise.user_id,
                      {
                        count: new_count,
                        log: log_arr,
                      },
                      (err, updated_log) => {
                        if (err) {
                          res
                            .json(400)
                            .send('Unable to Update Log. Bad Request');
                        }
                      }
                    );
                  }
                }
              );
            }
          });

          res.json({
            _id: new_exercise.user_id,
            username: new_exercise.username,
            description: new_exercise.description,
            duration: new_exercise.duration,
            date: new Date(new_exercise.date).toDateString(),
          });
        }
      });
    }
  });
});

// access all logs of any user
App.get('/api/users/:_id/logs', (req, res) => {
  LogModel.findById(req.params._id, (err, user_log) => {
    if (err) {
      res.status(500).json({
        error: err.message,
      });
    }
    if (user_log === null) {
      res.status(404).send('User Log Not Found!');
    } else {
      const log_obj = user_log.log.map((obj) => {
        return {
          description: obj.description,
          duration: obj.duration,
          date: new Date(obj.date).toDateString(),
        };
      });

      res.json({
        _id: user_log._id,
        username: user_log.username,
        count: user_log.count,
        log: log_obj,
      });
    }
  });
});

const CONN_PORT = process.env.PORT;
App.listen(CONN_PORT, () =>
  console.log(`Your App is Listening at http://localhost:${CONN_PORT}`)
);

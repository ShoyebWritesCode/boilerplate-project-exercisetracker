const Express = require('express');
const CORS = require('cors');
const UserModel = require('./models/UserSchema');
const ExerciseModel = require('./models/ExerciseSchema');
const LogModel = require('./models/LogSchema');
require('dotenv').config();
require('./config/dbconfig').connectDB();

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

  user_obj
    .save()
    .then((new_user) => {
      res.json(new_user);
    })
    .catch((err) => {
      res.status(500).json({
        error: err.message,
      });
    });
});

// get all users
App.get('/api/users', (req, res) => {
  UserModel.find()
    .then((all_users) => {
      res.json(all_users);
    })
    .catch((err) => {
      res.status(500).json({
        error: err.message,
      });
    });
});

// save exercises for the specified user
App.post('/api/users/:_id/exercises', (req, res) => {
  const user_id = req.params._id;

  UserModel.findById(user_id)
    .then((user) => {
      if (!user) {
        res.status(404).send('User Not Found!');
        return;
      }

      let date_input = req.body.date ? new Date(req.body.date) : new Date();

      const exercise_obj = new ExerciseModel({
        user_id: user._id,
        username: user.username,
        description: req.body.description,
        duration: req.body.duration,
        date: date_input,
      });

      return exercise_obj.save();
    })
    .then((new_exercise) => {
      if (!new_exercise) return;

      return LogModel.findById(new_exercise.user_id);
    })
    .then((log) => {
      if (!log) {
        // Create new log entry
        const log_obj = new LogModel({
          _id: new_exercise.user_id,
          username: new_exercise.username,
          count: 1,
          log: [
            {
              description: new_exercise.description,
              duration: new_exercise.duration,
              date: new_exercise.date,
            },
          ],
        });

        return log_obj.save();
      } else {
        // Update existing log entry
        return ExerciseModel.find({ user_id: new_exercise.user_id });
      }
    })
    .then((docs) => {
      if (!docs) return;

      const log_arr = docs.map((exerciseObj) => ({
        description: exerciseObj.description,
        duration: exerciseObj.duration,
        date: exerciseObj.date,
      }));

      const new_count = log_arr.length;

      return LogModel.findByIdAndUpdate(new_exercise.user_id, {
        count: new_count,
        log: log_arr,
      });
    })
    .then((updated_log) => {
      res.json({
        _id: new_exercise.user_id,
        username: new_exercise.username,
        description: new_exercise.description,
        duration: new_exercise.duration,
        date: new Date(new_exercise.date).toDateString(),
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err.message,
      });
    });
});

// access all logs of any user
App.get('/api/users/:_id/logs', (req, res) => {
  LogModel.findById(req.params._id)
    .then((user_log) => {
      if (!user_log) {
        res.status(404).send('User Log Not Found!');
        return;
      }

      const log_obj = user_log.log.map((obj) => ({
        description: obj.description,
        duration: obj.duration,
        date: new Date(obj.date).toDateString(),
      }));

      res.json({
        _id: user_log._id,
        username: user_log.username,
        count: user_log.count,
        log: log_obj,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err.message,
      });
    });
});

const CONN_PORT = process.env.PORT;
App.listen(CONN_PORT, () =>
  console.log(`Your App is Listening at http://localhost:${CONN_PORT}`)
);

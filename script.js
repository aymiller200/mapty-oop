/* 
!Planning an application: 
  ? Start with the user stories: 
      * Description of the application's functionality from the user's perspective. 
      * Common format: As a [type of user], I want [an action] so that [a benefit] <---Who, what, and why
      * EX: As a user, I want to log my running workouts with location, distance, time, pace, and steps/minute, so I can keep a log of all my running
      * All user stories for this App: 
            ? Log running workouts w/ location, distance, time, pace, steps/minute
            ? Log cycling with location, distance, time, speed, and elevation gain. 
            ? See all workouts at a glance. 
            ? See workout on a map. 
            ? See all workouts when leave the app and come back later.
  ? Features: 
      * Map where user clicks to add a new workout (best way to get location coordinates)
      * Geolocation to display the map at current location(more user friendly)
      * Form to input distance, time, pace, steps/minute (cadance)
      * Form to input distance, time, speed, elevation gain
      * Display all workout in a list
      * Display all workout on the map.
      * Store workout data in the browser using local storage API. 
      * On page load, read the saved date from local storage and display.
  ? Flow Chart: 
      * Will contain the features we are going to implement and also how they interact with each other in the app, and how data flows across the app.
  ? Architecture: 
      * Giving the project a structure, and in that structure, we can then develope functionality
      
*/

'use strict'

const form = document.querySelector('.form')
const containerWorkouts = document.querySelector('.workouts')
const inputType = document.querySelector('.form__input--type')
const inputDistance = document.querySelector('.form__input--distance')
const inputDuration = document.querySelector('.form__input--duration')
const inputCadence = document.querySelector('.form__input--cadence')
const inputElevation = document.querySelector('.form__input--elevation')

//Geolocation (Browser API)
//getCurrentPosition takes two callback functions: First will be called on success(whenever the browser successfully got the coordinates of the current position of the user). Second is the error callback which is the one that is called when there happened to be an error while getting the coordinates

class Workout {
  date = new Date()
  id = (Date.now() + '').slice(-10)

  constructor(coords, distance, duration) {
    this.coords = coords // [lat, lng]
    this.distance = distance //in km
    this.duration = duration //in min
  }

  _setDescription() {
    //prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`
  }
}

class Running extends Workout {
  type = 'running'
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration) //initialize this keyword
    this.cadence = cadence
    this.calcPace()
    this._setDescription()
  }

  calcPace() {
    //min/km
    this.pace = this.duration / this.distance
    return this.pace
  }
}
class Cycling extends Workout {
  type = 'cycling'
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration) //initialize this keyword
    this.elevationGain = elevationGain
    this.calcSpeed()
    this._setDescription()
  }

  calcSpeed() {
    //km/h
    this.speed = this.distance / (this.duration / 60)
    return this.speed
  }
}

///////////////////////////////////////////
//!Application Architecture

class App {
  //Private instance properties (Properties that are available on all the instances of this class)
  #map
  #mapZoom = 13
  #mapEvent
  #workouts = []

  constructor() {
    //Get users position:
    this._getPosition()

    //Get data from local Storage:
    this._getLocalStorage()

    //Event handlers:
    //an event handler function will always have the this keyword of the dom element to which it was attached (in this case 'form'). So we need to bind the this keyword to the App class, the object itself, rather than the form.
    form.addEventListener('submit', this._newWorkout.bind(this))
    inputType.addEventListener('change', this._toggleElevationField)
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this))
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position')
        },
      )
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords
    const { longitude } = position.coords
    const coords = [latitude, longitude]

    this.#map = L.map('map').setView(coords, this.#mapZoom)

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map)

    //Handling Clicks on Map
    this.#map.on('click', this._showForm.bind(this))

    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work)
    })
  }

  _showForm(mapE) {
    this.#mapEvent = mapE
    form.classList.remove('hidden')
    inputDistance.focus()
  }

  _hideForm() {
    //Empty Inputs
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value =
      ''
    form.style.display = 'none'
    form.classList.add('hidden')
    setTimeout(() => (form.style.display = 'grid'), 1000)
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
  }

  // hide form and clear input fields
  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp)) //every method will only return true if the value was true for all inputs

    const allPositive = (...inputs) => inputs.every((inp) => inp > 0)

    e.preventDefault()
    // Get data from form
    const type = inputType.value
    const distance = +inputDistance.value
    const duration = +inputDuration.value
    const { lat, lng } = this.#mapEvent.latlng
    let workout

    // If activity running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers!') //gaurd clause
      }

      workout = new Running([lat, lng], distance, duration, cadence)
    }
    //If activity cycling, create cycling object
    if (type === 'cycling') {
      // Check if data is valid
      const elevation = +inputElevation.value

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('Inputs have to be positive numbers!') //gaurd clause
      }
      workout = new Cycling([lat, lng], distance, duration, elevation)
    }
    //Add new object to workout array
    this.#workouts.push(workout)

    //Render Workout on map as marker
    this._renderWorkoutMarker(workout) //no need to use bind because we are calling the method ourselves, rather than it being a callback function.

    //Reder workout on List
    this._renderWorkout(workout)

    //Clear Input fields
    this._hideForm()

    //Set Local Storage to all workouts
    this._setLocalStorage()
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        }),
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`,
      )
      .openPopup()
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id=${workout.id}>
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `

    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `
    }

    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `
    }
    form.insertAdjacentHTML('afterend', html) //afterend will add the new element as a sibling element at the end of the form
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout')

    if (!workoutEl) return

    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id,
    )

    this.#map.setView(workout.coords, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    })
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts)) //local storage is blocking, which is something that's very bad, so you don't want to use it for large amounts of data.
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'))

    if (!data) return

    this.#workouts = data
    this.#workouts.forEach((work) => {
      this._renderWorkout(work)
    })
  }

  reset() {
    localStorage.removeItem('workouts')
    location.reload()
  }
}

const app = new App()

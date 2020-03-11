var yelp = { coords: [] };

var locationObj = {
    lat : null,
    lng : null
};

var contactInfo = [];

var map;
var geocoder;
var infoWindow;
var markers = [];
var origin = null;
var destination = {};
var directionsDisplay;
var yelpBase = 'https://api.yelp.com/v3/businesses/search?term=';
var yelpLat = '&latitude=';
var yelpLong = '&longitude=';

$(document).ready(startUp);

function startUp () {
    initialize();
    applyClickHandlers();
    modalDisplay();
}

function initialize() {
    var input = document.getElementById('locationInput');
    var autocomplete = new google.maps.places.Autocomplete(input);
    geocoder = new google.maps.Geocoder();
    var center = new google.maps.LatLng(37.09024, -100.712891);
    map = new google.maps.Map(document.getElementById('map'), {
        center: center,
        zoom: 10,
        panControl: false,
        mapTypeControl: false,
        zoomControl: true,
        streetViewControl: false,
        zoomControlOptions: {
            style: google.maps.ZoomControlStyle.LARGE,
            position: google.maps.ControlPosition.TOP_RIGHT
        },
        scaleControl: true
    });
    infoWindow = new google.maps.InfoWindow();
    directionsDisplay = new google.maps.DirectionsRenderer();
}

function applyClickHandlers(){
    $('#submitBeerButton').click(submitBeerSelection);
    $("#getLocationButton").click(getLocation);
    $(".submit").click(codeAddress);
    $('#tapButton').click(modalDisplay);
    $('#beerModal').modal({
        backdrop: 'static',
        keyboard: false
    });
    $('#locationInput').keypress(submitWithEnterKey).focus(checkValue).keyup(checkValue);
}

function checkValue() {
    var location = $('#locationInput').val();
    var locationLengthCheck = location.replace(/\s/g, '');
    if ((/^[A-Za-z0-9'\.\-\s\,\#]+$/i.test(location)) && (/\S/.test(location)) && locationLengthCheck.length >= 2) {
        $("#findLocationButton").removeAttr('disabled');
    } else {
        $("#findLocationButton").attr('disabled', 'disabled');
    }
}

function modalDisplay() {
    $('#findLocationButton').attr('disabled', 'disabled');
    directionsDisplay.setMap(null);
    hideAlert();
    $("#beerModal").modal();
}

function showLocationAlert(){
    if (!($('.spinnerContainer').hasClass('hideLoader'))) {
        $('.spinnerContainer').addClass('hideLoader');
    }
    if (locationObj.lng === null){
        showAlert('error','Please enter a location before moving on.');
    } else{
        showAlert('success','Your location has been set, now select your beer style!');
        $('#submitBeerButton').removeAttr('disabled');
    }
}

function showAlert(type,message){
    var $alert = $('#alertBox');
    $alert.css('display','block');
    $('#alertMessage').text(message);
    switch(type){
        case "error":
            $alert.addClass('alert-danger')
                .removeClass('alert-success')
                .find('#alertTitle').text('Error!');
            break;
        case "success":
            $alert.addClass('alert-success')
                .removeClass('alert-danger')
                .find('#alertTitle').text('Success!');
            break;
        default:
            break;
    }
}

function hideAlert(){
    $('#alertBox').css('display','none');
}

function createContactInfo(response) {
    for (var i=0; i<response.data.businesses.length; i++) {
        var addressInfo = {};
        var business = response.data.businesses[i];
        addressInfo.name = business.name;
        addressInfo.address = `${business.location.address1}, ${business.location.address2}, ${business.location.address3}`;
        addressInfo.city = business.location.city;
        addressInfo.state = business.location.state;
        addressInfo.zip = business.location.zip_code;
        addressInfo.phone = business.display_phone;
        if (addressInfo.phone != undefined) {
            addressInfo.phone = addressInfo.phone.substring(1);
        }
        addressInfo.url = business.url;
        contactInfo.push(addressInfo);
    }
}

function createMarker(response) {
    createContactInfo(response);
    var image="images/beer.png";
    map.setCenter(yelp.coords[0]);
    for (var i = 0; i < yelp.coords.length; i++) {
        var coordinates = yelp.coords[i];
        var marker = new google.maps.Marker({
            map: map,
            icon: image,
            position: coordinates,
            animation: google.maps.Animation.DROP,
            html:  '<div class="markerWindow">' +
            '<h1>' + contactInfo[i].name + '</h1>' +
            '<p>' + contactInfo[i].address + '</p>' +
            '<p>' + contactInfo[i].city + ', ' + contactInfo[i].state + ' ' + contactInfo[i].zip +'</p>' +
            '<p>' + contactInfo[i].phone + '</p>' +
            '<a target="_blank" href=' + contactInfo[i].url + '> reviews </a>' +
            '<a class="directions">get directions</a>' +
            '</div>'
        });
        markers.push(marker);
        google.maps.event.addListener(marker, 'click', function() {
            infoWindow.setContent(this.html);
            infoWindow.open(map, this);
            map.setCenter(this.getPosition());
            (function(self) {
                destination = self.position;
            })(this);
        });
        google.maps.event.addListener(map, 'click', function(){
            infoWindow.close();
        });
    }
}

function clearMarkers() {
    for (var m in markers) {
        markers[m].setMap(null)
    }
    markers = [];
    contactInfo = [];
}

function codeAddress() {
    hideAlert();
    var address = $(".address").val();
    origin = address;
    geocoder.geocode({'address': address}, function(results, status){
        locationObj.lat = results[0].geometry.location.lat();
        locationObj.lng = results[0].geometry.location.lng();
        if (status === 'OK'){
            map.setCenter(results[0].geometry.location);
            showLocationAlert();
        } else {
            showLocationAlert();
        }
    })
}

function submitWithEnterKey() {
    checkValue();
    if (event.keyCode === 13)
        $('#findLocationButton').click();
}

function getLocation() {
    hideAlert();
    $('.spinnerContainer').removeClass('hideLoader');
    $('.address').val('');
    $("#findLocationButton").attr('disabled', 'disabled');
    var options = {
        timeout: 5000
    };
    if (navigator.geolocation) {
        var geoSuccess = function (position) {
            var pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            map.setCenter(new google.maps.LatLng(pos.lat, pos.lng));
            locationObj = {};
            locationObj.lat = pos.lat;
            locationObj.lng = pos.lng;
            showLocationAlert();
        };
        var error = function() {
            modalAlert();
        };
        navigator.geolocation.getCurrentPosition(geoSuccess, error, options);
    } else {
        showLocationAlert();
    }
}

function getDirections(origin, destination) {
    var directionsService = new google.maps.DirectionsService();
    var request = { origin: origin,
        destination: destination,
        travelMode: 'DRIVING'
    };
    directionsDisplay.setMap(null);
    directionsDisplay.setMap(map);
    directionsService.route(request, function(result, status) {
        if (status == 'OK') {
            directionsDisplay.setDirections(result);
        }
    });
}

async function submitBeerSelection(){
    debugger;
    if (locationObj.lat === null){
        showAlert('error','Please enter a location before moving on.');
    } else {
        $('#submitBeerButton').attr('data-dismiss', 'modal');
        $('#domContainer').html('');
        $('#beginSearch').css('display','initial');
        await axiosToYelp(getYelpKeyword(),locationObj);
    }
}

function getYelpKeyword(){
    return $('input:checked').attr('yelpKeyWord');
}

async function axiosToYelp (keywords, location) {

    const res = await axios.get(`https://cors-anywhere.herokuapp.com/${yelpBase}${keywords}${yelpLat}${location.lat}${yelpLong}${location.lng}`, {
        headers: {
            Authorization: 'Bearer 13gcVwdZi-vBeIk6BUlyI1yAzKxsccr5Dytxc7AI7sww4ZN2hWzXon1tnU6Cz8KfkRC0aswhVI0RcQXEtVZZuQQN5HIhzGaEOLc5JWKUNthADtaN603ZJ5mLuQNpXnYx',
            'Access-Control-Allow-Origin': '*'
        }
    });

    console.log(res);

    yelp = res;
    yelp.coords = [];

    res.data.businesses.forEach((business, ind) => {
        yelp.coords[ind] = {
            lat: business.coordinates.latitude,
            lng: business.coordinates.longitude
        }
    });

    clearMarkers();
    createMarker(res);
    $('#map').on("click", ".directions", function() {
        if (origin === null) {
            origin = locationObj;
        }
        getDirections(origin, destination);
    });

}

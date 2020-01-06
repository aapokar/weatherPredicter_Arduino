function aloitus() {
    //Sivun latauksessa haetaan openweathermapista huomisen ennuste
    xowmhttp = new XMLHttpRequest(); //HttpRequest-olio http-pyyntöä varten owm
    xowmhttp.onreadystatechange = function () {     //Http-vastauksen tullessa suoritetaan funktio
        if (this.readyState == 4 && this.status == 200) {
            var data = JSON.parse(this.responseText);   //Vastaanotetun datan deserialisointi
            ennuste = data['list']['7']['main']['temp'];    //Tallennetaan muuttujaan huomisen ennuste
            haeDataJaPiirra(ennuste);   //Kutsutaan toista funktiota ja annetaan sille parametrina haettu data
        }
    };
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=Lahti&cnt=8&units=metric&appid=${apiKey()}`
    //Http-get-requestin muotoilu ja palvelimen osoite. Osoite sisältää parametrit palvelimen APIlle
    xowmhttp.open("GET", url, true);
    xowmhttp.send();    //Pyynnön lähetys

}

//funktio hakee dataa databasesta ja kutsuu kaavion piirtävää funktiota
function haeDataJaPiirra(ennuste) {
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var syote = JSON.parse(this.responseText);

            lista1 = syote.owm;     //Tallennetaan muuttujaan databaseen tallennetut openweathermap luvut
            lista2 = syote.dht22;   //Sensorin lukemat toiseen muuttujaan

            //Muuttujaan y tallennetaan funktion paluuarvo x. x on luku, johon on tallennettu molempien listojen samassa indeksissä olevien
            //arvojen erotus, kaavalla openweathermapin lukema - sensorin lukema. Nämä summataan yhteen eli saadaan erotusten summa.
            var y = (function () {
                var x = 0;
                for (var i = 0; i < lista1.length; i++) {
                    x = x + lista1[i] - lista2[i];
                }
                return x;
            })();

            //Erotusten keskiarvo saadaan jakamalla summa lukujen määrällä.
            y = y / lista1.length;

            //Luodaan uusi muuttuja, jossa parametrina saadusta ennusteesta vähennetään keskimääräinen lukemien erotus.
            ennusteHuomiselle = ennuste - y;
            //Taulukon alla oleviin <span> elementteihin asetetaan keskeiset luvut
            document.getElementById('testi2').innerHTML = y;
            document.getElementById('testi3').innerHTML = ennuste;
            document.getElementById('testi4').innerHTML = ennusteHuomiselle;
            //Kutsutaan kaavion piirtävää funktiota ja annetaan sille parametrina lukemat sisältävät listat sekä 
            //kompensoitu ennuste huomiselle
            piirraChart(lista1, lista2, ennusteHuomiselle);
        }
    };
    xhttp.open("GET", "https://asaiotbase.firebaseio.com/.json", true);
    xhttp.send();
}



//Viivakaavion piirtävä funktio
function piirraChart(lista11, lista22, ennuste1) {
    
    //Kaavion sarakkeita tehdään yksi enemmän kuin parametrina saaduissa listoissa on arvoja
    sarakkeet = (function () {
        var x = [];
        for (var i = 0; i <= lista11.length; i++) {
            if (i != lista11.length) {
                x[i] = i;   //Sarakkeen nimeksi asetetaan sen järjestysluku, nollasta alkaen
            } else {
                x[i] = 'Huomenna';  //Viimeiseen sarakkeeseen tulee huomisen kompensoitu ennuste
            }
        }
        return x;
    })();

    //Yksi kaavioon piirrettävistä käyristä on sensorin ja owm lukeman keskiarvo
    //Luvut syötetään listana, joten luodaan uusi lista muuttujaan ka. Huomisen ennuste tulee listan
    //Viimeiseksi arvoksi, joka on yhden enemmän kuin parametrina saaduissa listoissa
    ka = (function () {
        var x = [];
        for (var i = 0; i <= lista11.length; i++) {
            if (i != lista11.length) {
                x[i] = (lista11[i] + lista22[i]) / 2;
            } else {
                x[i] = ennuste1;
            }
        }

        return x;
    })();

    //heittoData-muuttujaan tallennetaan lista, jossa näkyy heitto eri mittaustuloksissa
    heittoData = (function () {
        var x = [];
        for (var i = 0; i < lista11.length; i++) {
            x[i] = (lista11[i] - lista22[i]);   //owm - sensori
        }

        return x;
    })();
    var ctx = document.getElementById('myChart').getContext('2d');  //Kaavion asettamiseen käytettävä elementti tallennetaan muuttujaan
    var myChart = new Chart(ctx, {      //Luodaan uusi Chart-olio, joka saa useita kutsuparametreja
        type: 'line',   //Kaavion tyyppi
        data: {     //Kaaviossa käytettävä data
            labels: sarakkeet,      //Lista sarakkeiden nimistä. Sarakkeiden määrä on sama kuin listan pituus
            datasets: [ //datasets-listan objektit ovat yksittäisiä käyriä kaaviossa
                
                {
                label: 'OWM',   //Käyrän nimi
                fill: false,    //Täytetäänkö käyrän ja nollan väli
                data: lista11,  //Käyrän y-akselin arvot listana
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)'   //Täytön väri
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)' //Käyrän väri
                ],
                borderWidth: 1  //Käyrän paksuus
            }, {
                label: 'DHT',
                fill: false,
                data: lista22,
                backgroundColor: [
                    'rgba(0, 99, 132, 0.2)'
                ],
                borderColor: [
                    'rgba(100, 99, 132, 1)'
                ],
                borderWidth: 1
            }, {
                label: 'keskiarvo',
                fill: false,
                data: ka,
                backgroundColor: [
                    'rgba(0, 99, 132, 0.2)'
                ],
                borderColor: [
                    'rgba(0, 255, 132, 1)'
                ],
                borderWidth: 1
            }, {
                label: 'heitto',
                fill: false,
                data: heittoData,
                backgroundColor: [
                    'rgba(0, 99, 132, 0.2)'
                ],
                borderColor: [
                    'rgba(155, 155, 55, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });
}


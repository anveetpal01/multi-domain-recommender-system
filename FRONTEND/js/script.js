// Function to set the theme based on the saved preference
function setTheme(theme) {
    document.body.classList.remove('light-mode', 'dark-mode');
    document.body.classList.add(theme);

    const themeToggleButton = document.getElementById('theme-toggle');

    // Check if the themeToggleButton exists before trying to modify it
    if (themeToggleButton) {
        // Change the button image based on the theme
        if (theme === 'dark-mode') {
            themeToggleButton.innerHTML = '<img src="images/logo.svg" alt="Switch to Light Mode" width="40px" height="40px"/>';
        } else {
            themeToggleButton.innerHTML = '<img src="images/logo.svg" alt="Switch to Dark Mode" width="40px" height="40px"/>';
        }
    }
}

// Check and apply the saved theme preference on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light-mode'; // Default to light-mode if no preference is saved
    setTheme(savedTheme);

    // Check if the theme-toggle button exists and add event listener only if it does
    const themeToggleButton = document.getElementById('theme-toggle');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', function() {
            const newTheme = document.body.classList.contains('light-mode') ? 'dark-mode' : 'light-mode';
            localStorage.setItem('theme', newTheme); // Save the new theme preference
            setTheme(newTheme);
        });
    }

    const body = document.body;

    // Add 'fade-in' class for the new page's entrance effect
    body.classList.add('fade-in');

    // Select all links for page navigation
    const links = document.querySelectorAll('nav a'); // Only select navigation links

    links.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault(); // Prevent immediate navigation

            // Add the slide-out class to trigger the slide-out effect
            body.classList.add('slide-out');

            // Redirect after the transition ends
            setTimeout(() => {
                window.location.href = this.href;
            }, 600); // Match the duration of the CSS animation
        });
    });

    // Optionally, you can add slide-in class to the new page after loading
    body.classList.add('slide-in');
});

// Scroll-triggered animations on page load
document.addEventListener('DOMContentLoaded', () => {
    const elements = document.querySelectorAll('.fade-in-up'); // Select all sections with fade-in-up class

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible'); // Add class when element comes into view
            }
        });
    }, { threshold: 0.5 }); // Trigger when 50% of the element is visible

    elements.forEach(element => {
        observer.observe(element); // Observe each element
    });
});



//*******  CODE FOR MOVIES.HTML  ************
//*******Code for fetching data for MOVIES and displaying it************

const MoviesApiKey = 'c2ddae4da825098d489b772dd70a49f8';  

// Function to fetch movies for a specific language
async function getMoviesFromAPI(language) {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${MoviesApiKey}&with_original_language=${language}`);
    const data = await response.json();
    return data.results;  // Returns an array of movies
  } catch (error) {
    console.error('Error fetching movies:', error);
  }
}

// Function to display movies
async function showFetchedMovies(language) {
  const movies = await getMoviesFromAPI(language);
  if (movies && movies.length > 0) {
    const movieContainer = document.getElementById('movie-container');
    
    // Clear existing content (if any)
    movieContainer.innerHTML = '';

    // Loop through each movie and create a card
    movies.forEach(movie => {
      const movieElement = document.createElement('div');
      movieElement.classList.add('movie');
      movieElement.innerHTML = `
        <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}">
        <h3>${movie.title}</h3>
        <p>Release Date: ${movie.release_date}</p>
      `;
      movieContainer.appendChild(movieElement);
    });
  } else {
    document.getElementById('movie-container').innerHTML = '<p>No movies found for this language.</p>';
  }
}

// Event listener for language selection
document.addEventListener('DOMContentLoaded', () => {
  const languageSelect = document.getElementById('language-select');

  // Display movies when a language is selected
  languageSelect.addEventListener('change', function() {
    const selectedLanguage = this.value;
    showFetchedMovies(selectedLanguage);
  });

  // Show movies in English by default when the page loads
  showFetchedMovies('en');
});



//*******  CODE FOR SONGS.HTML  ************
//*******Code for fetching data for SONGS and displaying it************

const SONGS_PER_PAGE = 50; // Number of songs to display per page
        let songsData = [];       // To store songs fetched from the dataset
        let currentPage = 1;

        // Function to fetch and parse Excel data
        async function fetchSongsData() {
            try {
                const response = await fetch('DATABASE/MUSIC-POSTER.xlsx'); // Path to your Excel file
                const arrayBuffer = await response.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                songsData = sheetData; // Store parsed data in global variable
                renderSongs(); // Render songs for the first page
            } catch (error) {
                console.error('Error fetching or processing the dataset:', error);
            }
        }

        // Function to render songs for the current page
        function renderSongs() {
            const songGridContainer = document.getElementById('song-grid-container');
            songGridContainer.innerHTML = ''; // Clear existing content

            const startIndex = (currentPage - 1) * SONGS_PER_PAGE;
            const endIndex = startIndex + SONGS_PER_PAGE;
            const currentSongs = songsData.slice(startIndex, endIndex);

            currentSongs.forEach(song => {
                const songCard = document.createElement('div');
                songCard.classList.add('song-card');
                songCard.innerHTML = `
                    <img src="${song.POSTER}" alt="${song.NAME}" class="song-poster">
                    <h3 class="song-name">${song.NAME}</h3>
                    <p class="song-artist">${song.ARTIST}</p>
                `;
                songGridContainer.appendChild(songCard);
            });

            updatePaginationControls();
        }

        // Function to update pagination controls
        function updatePaginationControls() {
            const totalPages = Math.ceil(songsData.length / SONGS_PER_PAGE);
            document.getElementById('prev-page-button').disabled = currentPage === 1;
            document.getElementById('next-page-button').disabled = currentPage === totalPages;
            document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
        }

        // Event listeners for pagination buttons
        document.getElementById('prev-page-button').addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderSongs();
            }
        });

        document.getElementById('next-page-button').addEventListener('click', () => {
            const totalPages = Math.ceil(songsData.length / SONGS_PER_PAGE);
            if (currentPage < totalPages) {
                currentPage++;
                renderSongs();
            }
        });

        // Load songs on page load
        fetchSongsData();


//*******  CODE FOR BOOKS.HTML  ************
//*******Code for fetching data for BOOKS and displaying it************




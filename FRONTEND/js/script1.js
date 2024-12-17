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






//*******  CODE FOR COURSES.HTML  ************
//*******Code for fetching data for COURSES and displaying it************

document.addEventListener("DOMContentLoaded", () => {
    fetch("DATABASE/New-Courses.json")
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to fetch courses. Status: " + response.status);
            }
            return response.json();
        })
        .then(courses => {
            const coursesContainer = document.getElementById("courses");

            // Iterate over each course object in the courses array
            courses.forEach(course => {
                const courseCard = document.createElement("div");
                courseCard.classList.add("course-card");

                // Access the correct keys for the course data
                courseCard.innerHTML = `
                    <div class="course-name">${course.course}</div>  <!-- Change 'course.name' to 'course.course' -->
                    <div class="course-university">University: ${course.university}</div>
                    <div class="course-difficulty">Difficulty: ${course.difficulty}</div>
                    <div class="course-rating">Rating: ${course.rating}</div>
                    <a class="course-link" href="${course.url}" target="_blank">View Course</a>
                `;

                coursesContainer.appendChild(courseCard);
            });
        })
        .catch(error => console.error("Error loading courses:", error));
});

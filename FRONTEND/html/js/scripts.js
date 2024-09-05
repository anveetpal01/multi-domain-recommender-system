// Function to set the theme based on the saved preference
function setTheme(theme) {
    document.body.classList.remove('light-mode', 'dark-mode');
    document.body.classList.add(theme);
    document.getElementById('theme-toggle').textContent = theme === 'dark-mode' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
}

// Check and apply the saved theme preference on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light-mode'; // Default to light-mode if no preference is saved
    setTheme(savedTheme);

    // Theme toggle functionality
    document.getElementById('theme-toggle').addEventListener('click', function() {
        const newTheme = document.body.classList.contains('light-mode') ? 'dark-mode' : 'light-mode';
        localStorage.setItem('theme', newTheme); // Save the new theme preference
        setTheme(newTheme);
    });

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
    // (Consider adding this if you want the new page to slide in as well)
    body.classList.add('slide-in');
});

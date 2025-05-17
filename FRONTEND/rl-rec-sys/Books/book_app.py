import pickle
import streamlit as st
import requests
import os
import json
import hashlib

# -------------------------
# File Paths
# -------------------------
USER_DATA_PATH = "user_data.json"
USER_CREDENTIALS_PATH = "user_credentials.json"
Q_TABLE_DIR = "q_tables"
os.makedirs(Q_TABLE_DIR, exist_ok=True)

# -------------------------
# Load Book Data
# -------------------------
books = pickle.load(open('D:/MULTI-DOMAIN RECOMMENDER SYSTEM/FRONTEND/rl-rec-sys/Books/books.pkl', 'rb'))
similarity = pickle.load(open('D:/MULTI-DOMAIN RECOMMENDER SYSTEM/FRONTEND/rl-rec-sys/Books/similarity.pkl', 'rb'))

# -------------------------
# Utility Functions
# -------------------------
def fetch_cover(thumbnail_url):
    return thumbnail_url if thumbnail_url else "https://via.placeholder.com/150"

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def load_json(path):
    if os.path.exists(path):
        with open(path, 'r') as f:
            return json.load(f)
    return {}

def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f)

def load_q_table(username):
    return load_json(os.path.join(Q_TABLE_DIR, f"{username}.json"))

def save_q_table(username, q_table):
    save_json(os.path.join(Q_TABLE_DIR, f"{username}.json"), q_table)

def update_q_table(q_table, state, action, reward, alpha=0.1, gamma=0.9):
    if state not in q_table:
        q_table[state] = {}
    if action not in q_table[state]:
        q_table[state][action] = 0
    old_value = q_table[state][action]
    q_table[state][action] = old_value + alpha * (reward + gamma * 0 - old_value)
    return q_table

def recommend_based_on_likes(liked_books):
    all_indexes = []
    for book in liked_books:
        try:
            idx = books[books['title'] == book].index[0]
            sims = list(enumerate(similarity[idx]))
            all_indexes.extend(sims)
        except:
            continue
    all_indexes = sorted(all_indexes, key=lambda x: x[1], reverse=True)
    seen = set(liked_books)
    recommended = []
    for idx, _ in all_indexes:
        title = books.iloc[idx].title
        if title not in seen and title not in recommended:
            recommended.append(title)
        if len(recommended) == 50:
            break
    covers = [fetch_cover(books[books['title'] == t].thumbnail.values[0]) for t in recommended]
    return recommended, covers

# -------------------------
# Streamlit App
# -------------------------
st.set_page_config(page_title="Book Recommender", layout="wide", initial_sidebar_state="expanded")

st.markdown("""
    <style>
        .title {
            font-size: 3em;
            color: #FF6347;
            text-align: center;
            font-weight: bold;
            font-family: 'Roboto', sans-serif;
        }
        .button {
            background-color: #FF6347;
            color: white;
            font-weight: bold;
            border-radius: 8px;
            padding: 10px 20px;
        }
        .movie-box {
            text-align: center;
            transition: transform 0.2s;
        }
        .movie-box:hover {
            transform: scale(1.1);
        }
    </style>
""", unsafe_allow_html=True)

st.title("📚 Books")

user_credentials = load_json(USER_CREDENTIALS_PATH)
user_data = load_json(USER_DATA_PATH)

# -------------------------
# Registration and Login
# -------------------------
if "username" not in st.session_state:
    auth_option = st.radio("Choose an option:", ["Login", "Register"], index=1)

    username_input = st.text_input("Username", placeholder="Enter your username")
    password_input = st.text_input("Password", type="password", placeholder="Enter your password")

    if auth_option == "Register":
        if st.button("Register", key="register"):
            if username_input in user_credentials:
                st.error("Username already exists.")
            elif username_input.strip() == "" or password_input.strip() == "":
                st.warning("Username and password cannot be empty.")
            else:
                user_credentials[username_input] = hash_password(password_input)
                user_data[username_input] = {"liked": []}
                save_json(USER_CREDENTIALS_PATH, user_credentials)
                save_json(USER_DATA_PATH, user_data)
                st.success("Registered successfully! Please log in.")
    else:
        if st.button("Login", key="login"):
            hashed = hash_password(password_input)
            if username_input in user_credentials and user_credentials[username_input] == hashed:
                st.session_state.username = username_input
                st.session_state.q_table = load_q_table(username_input)
                st.success(f"Welcome back, {username_input}!")
                st.rerun()
            else:
                st.error("Invalid username or password.")
    st.stop()

# -------------------------
# Main App After Login
# -------------------------
username = st.session_state.username
q_table = st.session_state.q_table
user_likes = user_data[username]["liked"]

st.subheader(f"👋 Hello, {username}")
st.write("Your liked books:", user_likes if user_likes else "None yet")

# --- Recommend Button ---
if st.button("🎯 Recommend Books", key="recommend", help="Click to get personalized book recommendations!", use_container_width=True):
    recommended, covers = recommend_based_on_likes(user_likes[-3:] if user_likes else ["The Great Gatsby"])
    st.session_state.recommended = recommended
    st.session_state.cover_links = covers

# --- Show Recommendations ---
if "recommended" in st.session_state:
    st.subheader("Top Recommendations for You:")
    for i in range(0, len(st.session_state.recommended), 5):
        cols = st.columns(5)
        for j in range(5):
            idx = i + j
            if idx < len(st.session_state.recommended):
                book = st.session_state.recommended[idx]
                cover = st.session_state.cover_links[idx]
                with cols[j]:
                    st.image(cover, width=150)
                    st.caption(book)
                    if st.button(f"👍 Like {idx+1}", key=f"like{idx}", use_container_width=True):
                        if book not in user_likes:
                            user_likes.append(book)
                            user_data[username]["liked"] = user_likes
                            save_json(USER_DATA_PATH, user_data)
                            if len(user_likes) > 1:
                                prev = user_likes[-2]
                                q_table = update_q_table(q_table, prev, book, reward=1)
                                save_q_table(username, q_table)
                            st.success(f"Liked {book}")
                            st.rerun()
                    if st.button(f"👎 Dislike {idx+1}", key=f"dislike{idx}", use_container_width=True):
                        if user_likes:
                            prev = user_likes[-1]
                            q_table = update_q_table(q_table, prev, book, reward=-1)
                            save_q_table(username, q_table)
                            st.warning(f"Disliked {book}")
                            st.rerun()

# --- Show Q-table ---
with st.expander("📊 View Learning (Your Q-table)"):
    st.json(q_table)

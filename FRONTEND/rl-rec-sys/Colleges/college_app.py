import pickle
import streamlit as st
import requests
import os
import json
import hashlib

# -------------------------
# File Paths
# -------------------------
USER_DATA_PATH = "user_data_colleges.json"
USER_CREDENTIALS_PATH = "user_credentials_colleges.json"
Q_TABLE_DIR = "q_tables_colleges"
os.makedirs(Q_TABLE_DIR, exist_ok=True)

# -------------------------
# Load College Data
# -------------------------
colleges = pickle.load(open('D:/MULTI-DOMAIN RECOMMENDER SYSTEM/FRONTEND/rl-rec-sys/Colleges/colleges.pkl', 'rb'))
similarity = pickle.load(open('D:/MULTI-DOMAIN RECOMMENDER SYSTEM/FRONTEND/rl-rec-sys/Colleges/similarity.pkl', 'rb'))

# -------------------------
# Utility Functions
# -------------------------
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

def recommend_based_on_likes(liked_colleges):
    if not liked_colleges:
        recommended_df = colleges.sample(50)
        return recommended_df['College_Name'].tolist()

    all_indexes = []
    for college in liked_colleges:
        try:
            if college not in colleges['College_Name'].values:
                continue
            idx = colleges[colleges['College_Name'] == college].index[0]
            sims = list(enumerate(similarity[idx]))
            all_indexes.extend(sims)
        except:
            continue

    all_indexes = sorted(all_indexes, key=lambda x: x[1], reverse=True)
    seen = set(liked_colleges)
    recommended = []
    for idx, _ in all_indexes:
        name = colleges.iloc[idx].College_Name
        if name not in seen and name not in recommended:
            recommended.append(name)
        if len(recommended) == 50:
            break

    return recommended

# -------------------------
# Streamlit App
# -------------------------
st.set_page_config(page_title="College Recommender", layout="wide", initial_sidebar_state="expanded")

# Custom CSS
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

st.title("🏫 Colleges")

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
st.write("Your liked colleges:", user_likes if user_likes else "None yet")

if st.button("🎯 Recommend Colleges", key="recommend", help="Click to get personalized college recommendations!", use_container_width=True):
    recommended = recommend_based_on_likes(user_likes[-3:] if user_likes else ["Indian Institute of Technology Madras "])
    st.session_state.recommended = recommended if recommended else []

if "recommended" in st.session_state:
    st.subheader("Top Recommendations for You:")
    for i in range(0, len(st.session_state.recommended), 5):
        cols = st.columns(5)
        for j in range(5):
            idx = i + j
            if idx < len(st.session_state.recommended):
                college = st.session_state.recommended[idx]
                with cols[j]:
                    st.markdown(f"""
    <style>
        .college-box-{idx} {{
            background-color: #0a0f3c;
            padding: 15px;
            border-radius: 12px;
            box-shadow: 0 0 10px #00bfff;
            text-align: center;
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease-in-out;
        }}
        .college-box-{idx}:hover {{
            box-shadow: 0 0 25px #1e90ff;
            transform: scale(1.05);
        }}
    </style>
    <div class="college-box-{idx}">
        <strong style="font-size: 1em; color: white;">{college}</strong>
    </div>
""", unsafe_allow_html=True)
                    if st.button(f"👍 Like {idx+1}", key=f"like{idx}", use_container_width=True):
                        if college not in user_likes:
                            user_likes.append(college)
                            user_data[username]["liked"] = user_likes
                            save_json(USER_DATA_PATH, user_data)
                            if len(user_likes) > 1:
                                prev = user_likes[-2]
                                q_table = update_q_table(q_table, prev, college, reward=1)
                                save_q_table(username, q_table)
                            st.success(f"Liked {college}")
                            st.rerun()
                    if st.button(f"👎 Dislike {idx+1}", key=f"dislike{idx}", use_container_width=True):
                        if user_likes:
                            prev = user_likes[-1]
                            q_table = update_q_table(q_table, prev, college, reward=-1)
                            save_q_table(username, q_table)
                            st.warning(f"Disliked {college}")
                            st.rerun()

with st.expander("📊 View Learning (Your Q-table)"):
    st.json(q_table)

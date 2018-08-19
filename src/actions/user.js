import axios from 'axios';
import {actionTypes, constants} from '../common';

export const googleSignin = () => {

    // function that dispatches an action at a later time
    return (dispatch) => {

        oauthSignIn();
        dispatch({
            type: actionTypes.GOOGLE_AUTHENTICATION,
            status: 'WAITING',
            isAuthorized: false,
            profile: undefined
        });

        /*
        * Create form to request access token from Google's OAuth 2.0 server.
        */
        function oauthSignIn() {
            // Create <form> element to submit parameters to OAuth 2.0 endpoint.
            const form = document.createElement('form');
            form.setAttribute('method', 'GET'); // Send as a GET request.
            form.setAttribute('action', constants.GOOGLE_OAUTH2_API);

            // Parameters to pass to OAuth 2.0 endpoint.
            const params = {
                'client_id': constants.GOOGLE_CLIENT_ID,
                'redirect_uri': constants.GOOGLE_OAUTH2_REDIRECT_URL,
                'response_type': 'token',
                'scope': constants.GOOGLE_API_SCOPES,
                'include_granted_scopes': 'true',
                'state': 'Authentication'
            };

            // Add form parameters as hidden input values.
            for (const p in params) {
                const input = document.createElement('input');
                input.setAttribute('type', 'hidden');
                input.setAttribute('name', p);
                input.setAttribute('value', params[p]);
                form.appendChild(input);
            }

            // Add form to page and submit it to open the OAuth 2.0 endpoint.
            document.body.appendChild(form);
            form.submit();
        }
    };
};

export const googleAuthentication = (token) => {
    return (dispatch) => {
        return axios
            .get(`${constants.GOOGLE_TOKEN_INFO_API}?access_token=${token}`)
            .then(response => {
                // Dispatch another action to consume data
                if (response.status === 200) {
                    if (parseInt(response.data.expires_in) > 0) {
                        googleGetUserProfile(token)
                            .then(profile => {
                                dispatch({
                                    type: actionTypes.GOOGLE_AUTHENTICATION,
                                    status: 'SUCCESS',
                                    isAuthorized: true,
                                    profile: profile,
                                    token: token
                                });
                            })
                            .catch(error => {
                                dispatch({
                                    type: actionTypes.GOOGLE_AUTHENTICATION,
                                    status: 'ERROR',
                                    isAuthorized: false,
                                    profile: undefined,
                                    token: undefined
                                });
                            });
                    } else {
                        dispatch({
                            type: actionTypes.GOOGLE_AUTHENTICATION,
                            status: 'ERROR',
                            isAuthorized: false,
                            profile: undefined,
                            token: undefined
                        });
                    }
                } else {
                    dispatch({
                        type: actionTypes.GOOGLE_AUTHENTICATION,
                        status: 'ERROR',
                        isAuthorized: false,
                        profile: undefined,
                        token: undefined
                    });
                }
            })
            .catch(error => {
                dispatch({
                    type: actionTypes.GOOGLE_AUTHENTICATION,
                    status: 'ERROR',
                    isAuthorized: false,
                    profile: undefined,
                    token: undefined
                });
            });
    }
};

const googleGetUserProfile = (token) => {
    return axios
        .get(`${constants.GOOGLE_USER_INFO_API}?access_token=${token}`)
        .then(response => {
            // Dispatch another action to consume data
            if (response.status === 200) {
                return {
                    id: response.data.sub,
                    fullName: response.data.name,
                    firstName: response.data.given_name,
                    lastName: response.data.family_name,
                    imageURL: response.data.picture,
                    email: response.data.email
                };
            } else {
                throw "error";
            }
        })
        .catch(error => {
            throw error;
        });
};

function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

export const save = (userData, data) => {

    userData.coins = parseInt(userData.coins) + parseInt(data.amount);
    userData.saving = parseInt(userData.saving) + parseInt(data.amount);
    userData.goals.forEach(function (goal) {
        if (goal.isActive) {
            goal.currentAmount += data.amount;
            if (goal.currentAmount >= goal.objective) {
                goal.isActive = false;
                goal.achieved = true;
            }
            for (let i = 1; i <= goal.weeks.length; ++i) {
                let today = new Date();
                if (goal.weeks[i].achieved === undefined) {
                    if (i - 1 > -1) {
                        // if current week
                        if (addDays(goal.startDate, ((i - 1)) * 7) < today && today <= addDays(goal.startDate, (i * 7))) {
                            if (goal.currentAmount >= goal.weeks[i].target) {
                                goal.weeks[i].achieved = true;
                            }
                        } else if (today <= addDays(goal.startDate, (i * 7))) {
                            if (goal.currentAmount >= goal.weeks[i].target) {
                                goal.weeks[i].achieved = true;
                            }
                        } else if (today > addDays(goal.startDate, (i * 7))) {
                            if (goal.currentAmount >= goal.weeks[i].target) {
                                goal.weeks[i].achieved = false;
                            }
                        }
                    } else {
                        // if current week
                        if (today <= addDays(goal.startDate, (i * 7))) {
                            if (goal.currentAmount >= goal.weeks[i].target) {
                                goal.weeks[i].achieved = true;
                            }
                        } else if (today <= addDays(goal.startDate, (i * 7))) {
                            if (goal.currentAmount >= goal.weeks[i].target) {
                                goal.weeks[i].achieved = true;
                            }
                        } else if (today > addDays(goal.startDate, (i * 7))) {
                            if (goal.currentAmount >= goal.weeks[i].target) {
                                goal.weeks[i].achieved = false;
                            }
                        }
                    }
                }
            }
        }
    });

    return (dispatch) => {
        return axios
            .patch(`http://localhost:3001/users/${userData.id}`, userData)
            .then(response => {
                // Dispatch another action to consume data
                if (response.status === 200) {
                    dispatch({
                        type: actionTypes.SAVE,
                        status: 'UPDATED'
                    });
                } else {
                    dispatch({
                        type: actionTypes.SAVE,
                        status: 'ERROR'
                    });
                }
            })
            .catch(error => {
                dispatch({
                    type: actionTypes.SAVE,
                    status: 'ERROR'
                });
            });
    }
};


export const getUser = email => {
    return dispatch => {
        return (
            axios.get(`http://localhost:3001/users/${email}`)
                .then(response => {
                    // Dispatch another action to consume data
                    if (response.status === 200) {
                        dispatch({
                            type: actionTypes.GET_USER,
                            status: 'SUCCESS',
                            user: response.data
                        });
                    } else if (response.status === 404) {
                        addUser(email)
                            .then(user => {
                                dispatch({
                                    type: actionTypes.GET_USER,
                                    status: 'SUCCESS',
                                    user: user
                                });
                            })
                            .catch(error => {
                                dispatch({
                                    type: actionTypes.GET_USER,
                                    status: 'ERROR',
                                    user: undefined
                                });
                            });
                    } else {
                        dispatch({
                            type: actionTypes.GET_USER,
                            status: 'ERROR',
                            user: undefined
                        });
                    }
                }).catch(() => {
                addUser(email)
                    .then(user => {
                        dispatch({
                            type: actionTypes.GET_USER,
                            status: 'SUCCESS',
                            user: user
                        });
                    });
                dispatch({
                    type: actionTypes.GET_USER,
                    status: 'ERROR',
                    user: undefined
                });
            })
        );
    };
};

const addUser = email => {
    const user = {
        id: email,
        coins: 10,
        saving: 2000,
        goals: []
    };

    return axios
        .post(`http://localhost:3001/users`, user)
        .then(response => {
            // Dispatch another action to consume data
            if (response.status === 200) {
                return user;
            } else {
                throw 'error';
            }
        })
        .catch(error => {
            throw error;
        });
};

export const addGoal = (userData, data) => {

    const today = new Date();
    let weeks = [];
    data.weeksArray.forEach((target) => {
        weeks.push({
            "target": target,
            "achieved": false
        });
    });

    const goal = {
        "id": userData.goals.length + 1,
        "name": data.title,
        "category": data.category,
        "achieved": false,
        "isActive": true,
        "objective": data.amount,
        "startDate": today,
        "currentAmount": 0,
        "weeks": weeks
    };

    userData.goals.push(goal);

    return (dispatch) => {
        return axios
            .patch(`http://localhost:3001/users/${userData.id}`, userData)
            .then(response => {
                // Dispatch another action to consume data
                if (response.status === 200) {
                    dispatch({
                        type: actionTypes.SAVE,
                        status: 'UPDATED'
                    });
                } else {
                    dispatch({
                        type: actionTypes.SAVE,
                        status: 'ERROR'
                    });
                }
            })
            .catch(error => {
                dispatch({
                    type: actionTypes.SAVE,
                    status: 'ERROR'
                });
            });
    }
};
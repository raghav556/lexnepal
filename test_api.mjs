import { api } from './convex/_generated/api.js'; 
import { getFunctionName } from 'convex/server';
console.log(api.users.getCurrentUser, typeof api.users.getCurrentUser);
console.log(Object.keys(api.users.getCurrentUser || {}));
try { console.log("getFunctionName: ", getFunctionName(api.users.getCurrentUser)); } catch (e) { console.log(e.message); }

import dashboard from "./dashboard.js";
import software from "./software.js";
import backup from "./backup.js";
import hardware from "./hardware.js";
import monitor from "./monitor.js";
import storage from "./storage.js";
import network from "./network.js";
import services from "./services.js";
import users from "./users.js";
import logs from "./logs.js";
import personalization from "./personalization.js";

export const groups = [
  { id: "main", title: null },
  { id: "system", title: "Sistema" },
  { id: "admin", title: "Administração" },
];

export const pages = [dashboard, software, backup, hardware, monitor, storage, network, services, users, logs, personalization];

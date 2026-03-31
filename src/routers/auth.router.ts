import { Router } from 'express';
import { register, login, logout, refreshToken, loginWithGoogle } from '../modules/auth.controller';
import { authLimiter } from '../middlewares/rate-limit.middleware';
import { DeletePermission, GetActions, GetPermission, GetPermissions, GetResources, UpsertPermission } from '../modules/admin.controller/permission';
import { DeleteRole, DisableOrEnableRole, GetRoleById, GetRoles, UpsertRole } from '../modules/admin.controller/role';
import { AssignRoleToUser, GetUsers,GetUserById } from '../modules/admin.controller/user';

const router = Router();

//user
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/loginGoogle", authLimiter, loginWithGoogle);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.post("/assign-roles", AssignRoleToUser);
router.get("/users", GetUsers);
router.get("/users/:id", GetUserById);

// permission
router.post("/permissions", UpsertPermission);
router.get("/permissions", GetPermissions);
router.get("/permissions/:id", GetPermission);
router.get("/permissions/action", GetActions);
router.get("/permissions/resources", GetResources);
router.delete("/permissions/:id", DeletePermission);



//role
router.post("/role", UpsertRole);
router.get("/role", GetRoles);
router.get("/role", GetRoleById);
router.delete("/role", DeleteRole);
router.patch("/role", DisableOrEnableRole);


// router
export default router;

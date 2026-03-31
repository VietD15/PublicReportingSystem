import userRoleScheme from "../../models/auth/user_role";
import { GetMeInterface } from "../aggregation/user";
import authSchema from "../../models/auth.model";
import userRoleSchema from "../../models/auth/user_role";
import roleSchema from "../../models/auth/roles";

export const GetRoleIDsByUserID = async (userId: string) => {
    const roles = await userRoleScheme
        .find({ user_id: userId })
        .select("role_id -_id");

    return roles.map(r => r.role_id);
}

export const AddNewRolesToNewUser = async (
    userId: string,
    roleId: string
) => {
    return await userRoleScheme.create({
        user_id: userId,
        role_id: roleId
    });

};

export const assignRoleToUser = async (
    userId: string,
    roleIds: string[]
) => {

    if (!Array.isArray(roleIds)) {
        throw new Error("roleIds must be an array");
    }

    const existing = await userRoleScheme.find({
        user_id: userId
    }).lean();

    const existingRoleIds = existing.map(r => r.role_id);

    const toAdd = roleIds.filter(r => !existingRoleIds.includes(r));
    const toRemove = existingRoleIds.filter(r => !roleIds.includes(r));

    if (toAdd.length > 0) {
        const data = toAdd.map(roleId => ({
            user_id: userId,
            role_id: roleId
        }));

        await userRoleScheme.insertMany(data);
    }

    if (toRemove.length > 0) {
        await userRoleScheme.deleteMany({
            user_id: userId,
            role_id: { $in: toRemove }
        });
    }

    return await userRoleScheme.find({
        user_id: userId
    }).lean();
};

export const CountUsersByRoles = async (roleIds: string[]) => {

    return await userRoleScheme.aggregate([
        {
            $match: {
                role_id: { $in: roleIds }
            }
        },
        {
            $group: {
                _id: "$role_id",
                count: { $sum: 1 }
            }
        }
    ]);

};

export const GetMe = async (userId: string): Promise<GetMeInterface | null> => {
    if (!userId) {
        throw new Error("Missing required fields");
    }

    const user = await authSchema.findOne({
        _id: userId
    }).lean();

    const aggregate = await userRoleSchema.aggregate([
        {
            $match: { user_id: userId }
        },
        {
            $lookup: {
                from: "rolepermissions",
                localField: "role_id",
                foreignField: "role_id",
                as: "role_perms"
            }
        },
        { $unwind: "$role_perms" },
        {
            $lookup: {
                from: "permissions",
                localField: "role_perms.perm_id",
                foreignField: "perm_id",
                as: "permission"
            }
        },
        { $unwind: "$permission" },
        {
            $group: {
                _id: "$permission.perm_id",
                permission: { $first: "$permission" }
            }
        },
        {
            $lookup: {
                from: "resources",
                localField: "permission.resource_id",
                foreignField: "resource_id",
                as: "resource"
            }
        },
        { $unwind: "$resource" },
        {
            $lookup: {
                from: "permissionactions",
                localField: "_id",
                foreignField: "perm_id",
                as: "perm_actions"
            }
        },
        {
            $lookup: {
                from: "actions",
                localField: "perm_actions.action_id",
                foreignField: "action_id",
                as: "actions"
            }
        },
        {
            $project: {
                _id: 0,
                permission: "$permission.name",
                resource: "$resource.name",
                actions: "$actions.name"
            }
        }
    ]);

    const result: GetMeInterface = {
        user_id: user?._id.toString() || "",
        username: user?.userName || "",
        email: user?.email || "",
        permissions: aggregate.map(a => ({
            permission: a.permission,
            resource: a.resource,
            actions: a.actions.map((action: any) => ({
                name: action
            }))
        }))
    }

    return result;
}

export const getUsers = async (search: string) => {
    const query: any = {};

    if (search) {
        query.$or = [
            { userName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
        ];
    }

    const users = await authSchema.find(query).lean();

    const total = await authSchema.countDocuments(query);

    return {
        users,
        total
    }
}

export const getUser = async (userId: string) => {
    const user = await authSchema.findOne({ _id: userId }).lean();
    if (!user) {
        return null;
    }

    const roles = await userRoleSchema.find({ user_id: userId }).lean();

    const roleIds = roles.map(r => r.role_id);

    const roleRes = await roleSchema.find({ role_id: { $in: roleIds } }).lean();

    const roleName = roleRes.map(r => r.name);

    return {
        user,
        roles: roleName
    }
}
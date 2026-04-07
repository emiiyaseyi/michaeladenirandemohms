import { Plus, Users } from "lucide-react"

const departments = [
  { name: "Engineering", head: "Emeka Nwachukwu", employees: 42, budget: "₦18.5M", openRoles: 3 },
  { name: "Analytics", head: "Amaka Okonkwo", employees: 35, budget: "₦14.2M", openRoles: 2 },
  { name: "Research", head: "Chidi Obiora", employees: 28, budget: "₦12.0M", openRoles: 1 },
  { name: "Operations", head: "Fatima Aliyu", employees: 31, budget: "₦11.5M", openRoles: 0 },
  { name: "Human Resources", head: "Ngozi Adeyemi", employees: 12, budget: "₦5.8M", openRoles: 1 },
  { name: "Marketing", head: "Bola Abiodun", employees: 18, budget: "₦7.2M", openRoles: 2 },
  { name: "Finance", head: "Kemi Okafor", employees: 15, budget: "₦6.5M", openRoles: 0 },
  { name: "Programs", head: "Adewale Ojo", employees: 22, budget: "₦9.8M", openRoles: 2 },
]

const colors = ["#003B8E", "#E3192A", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#be123c", "#15803d"]

export default function DepartmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Departments
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            {departments.length} departments across DSN
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "var(--primary)" }}
        >
          <Plus size={16} />
          Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {departments.map((dept, i) => (
          <div
            key={dept.name}
            className="rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ background: colors[i % colors.length] }}
              >
                {dept.name.substring(0, 2).toUpperCase()}
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: dept.openRoles > 0 ? "var(--info-bg)" : "var(--muted)", color: dept.openRoles > 0 ? "var(--info)" : "var(--muted-foreground)" }}
              >
                {dept.openRoles > 0 ? `${dept.openRoles} open roles` : "Fully staffed"}
              </span>
            </div>

            <h3 className="font-semibold text-base mb-1" style={{ color: "var(--foreground)" }}>
              {dept.name}
            </h3>
            <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
              Head: {dept.head}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users size={14} style={{ color: "var(--muted-foreground)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {dept.employees}
                </span>
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  employees
                </span>
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--primary)" }}>
                {dept.budget}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

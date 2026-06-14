import NewPlanWizard from '@/components/forms/NewPlanWizard'

export default function NewPlanPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Create New Fitness Plan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Complete your profile and we'll generate a personalized plan via GenLayer AI.
        </p>
      </div>
      <NewPlanWizard />
    </div>
  )
}

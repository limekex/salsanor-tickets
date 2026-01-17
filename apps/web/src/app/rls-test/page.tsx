import { testRLSSessionContext, verifySessionContext } from '@/app/actions/rls-test'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function RLSTestPage() {
  // Require authentication (any staff member can access)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  // Get test data
  const organizers = await prisma.organizer.findMany({
    select: {
      id: true,
      name: true,
      slug: true
    },
    take: 5
  })

  // Run RLS test
  const testResult = await testRLSSessionContext()

  // Verify session variables work
  const verifyResult = organizers.length > 0 
    ? await verifySessionContext(organizers[0].id)
    : null

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">RLS Session Context Test (POC)</h1>

      <div className="space-y-6">
        {/* User Context */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Current User Context</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Organization ID:</span>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">
                {testResult.organizerId || 'None'}
              </code>
            </div>
            <div>
              <span className="font-medium">Is Global Admin:</span>{' '}
              <span className={testResult.isAdmin ? 'text-green-600' : 'text-gray-600'}>
                {testResult.isAdmin ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="font-medium">Status:</span>{' '}
              <span className={testResult.success ? 'text-green-600' : 'text-red-600'}>
                {testResult.success ? '✓ Success' : '✗ Failed'}
              </span>
            </div>
            {testResult.error && (
              <div className="text-red-600 mt-2">
                Error: {testResult.error}
              </div>
            )}
          </div>
        </section>

        {/* Orders Visible */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            Orders Visible ({testResult.orderCount})
          </h2>
          {testResult.orders.length > 0 ? (
            <div className="space-y-3">
              {testResult.orders.map((order) => (
                <div
                  key={order.id}
                  className="border-l-4 border-blue-500 pl-4 py-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono text-sm text-gray-600">
                        {order.id.slice(0, 8)}...
                      </div>
                      <div className="text-sm">
                        Status: <span className="font-medium">{order.status}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        {(order.totalCents / 100).toFixed(2)} kr
                      </div>
                      <div className="text-xs text-gray-600 font-mono">
                        Org: {order.organizerId.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 italic">
              No orders visible for this context
            </div>
          )}
        </section>

        {/* Session Variable Verification */}
        {verifyResult && (
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              Session Variable Verification
            </h2>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Test Status:</span>{' '}
                <span className={verifyResult.success ? 'text-green-600' : 'text-red-600'}>
                  {verifyResult.success ? '✓ Variables set correctly' : '✗ Failed'}
                </span>
              </div>
              {verifyResult.success && (
                <>
                  <div>
                    <span className="font-medium">Set organizerId:</span>{' '}
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {verifyResult.settings.organizerId}
                    </code>
                  </div>
                  <div>
                    <span className="font-medium">Set isAdmin:</span>{' '}
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {verifyResult.settings.isAdmin}
                    </code>
                  </div>
                </>
              )}
              {verifyResult.error && (
                <div className="text-red-600 mt-2">
                  Error: {verifyResult.error}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Available Organizers */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            Available Organizers (Test Data)
          </h2>
          <div className="space-y-2">
            {organizers.map((org) => (
              <div
                key={org.id}
                className="flex justify-between items-center py-2 border-b"
              >
                <div>
                  <div className="font-medium">{org.name}</div>
                  <div className="text-sm text-gray-600">{org.slug}</div>
                </div>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {org.id.slice(0, 13)}...
                </code>
              </div>
            ))}
          </div>
        </section>

        {/* Explanation */}
        <section className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">How This Works</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Server identifies your user and gets organizerId from roles</li>
            <li>
              Server sets <code className="bg-white px-1">app.organizer_id</code> in transaction
            </li>
            <li>Prisma queries run within that transaction</li>
            <li>
              <strong>When RLS is enabled:</strong> Postgres will enforce organizerId
              filtering automatically
            </li>
            <li>
              Currently: Manual filtering in code (RLS not enabled yet)
            </li>
          </ol>
          <div className="mt-4 p-4 bg-white rounded border-l-4 border-green-500">
            <strong>🔒 RLS Status:</strong> ENABLED on Order table ✅
            <div className="text-sm mt-2 text-gray-600">
              Database is now enforcing organization isolation via RLS policies.
              Session variables (app.organizer_id, app.is_global_admin) are checked by PostgreSQL.
              App-level filtering is kept as additional safety layer.
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

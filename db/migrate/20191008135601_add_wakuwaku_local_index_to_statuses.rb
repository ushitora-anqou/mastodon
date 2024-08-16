class AddWakuwakuLocalIndexToStatuses < ActiveRecord::Migration[5.2]
  disable_ddl_transaction!

  def up
    add_index :statuses, [:id, :account_id], name: :index_statuses_wakuwaku_local_20191008, algorithm: :concurrently, order: { id: :desc }, where: '(local OR (uri IS NULL)) AND deleted_at IS NULL AND (visibility = 0 OR visibility = 1) AND reblog_of_id IS NULL AND ((NOT reply) OR (in_reply_to_account_id = account_id))'
  end

  def down
    remove_index :statuses, name: :index_statuses_wakuwaku_local_20191008
  end
end

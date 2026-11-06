require_relative "pages-network"
probes = {
  "public TCP server" => proc { TCPServer.new("0.0.0.0", 0) },
  "loopback TCP server" => proc { TCPServer.new("127.0.0.1", 0) },
  "UDP bind" => proc { UDPSocket.new.bind("0.0.0.0", 0) },
  "TCP connection" => proc { Socket.tcp("127.0.0.1", 9) }
}
probes.each do |name, probe|
  begin
    probe.call
  rescue RuntimeError => error
    abort "Wrong error for #{name}: #{error}" unless error.message.start_with?("Pages build must not")
    next
  end
  abort "Network policy failed: #{name} was not rejected"
end
puts "Pages Ruby network policy: #{probes.size} rejected probes; no bind/listen/connect allowed."

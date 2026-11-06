# Build-time policy only; never loaded by the public site or Pages deployment.
# No Jekyll serve, DNS probes, listening socket, or external connection is needed.
require "socket"
module PagesNoBind
  def bind(*)
    raise "Pages build must not bind a network socket"
  end
  def listen(*)
    raise "Pages build must not listen on a network socket"
  end
  def connect(*)
    raise "Pages build must not open a network connection"
  end
  def connect_nonblock(*)
    raise "Pages build must not open a network connection"
  end
end
Socket.prepend(PagesNoBind)
UDPSocket.prepend(PagesNoBind)
module PagesNoServer
  def new(*)
    raise "Pages build must not open a network connection or server"
  end
  alias open new
end
TCPServer.singleton_class.prepend(PagesNoServer)
TCPSocket.singleton_class.prepend(PagesNoServer)
module PagesNoTCP
  def tcp(*)
    raise "Pages build must not open a network connection"
  end
end
Socket.singleton_class.prepend(PagesNoTCP)
